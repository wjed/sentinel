terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

locals {
  prefix     = "${var.project_name}-${var.environment}"
  alb_domain = var.enable_custom_domain && var.domain_name != null ? "api.${var.domain_name}" : null
}

# ── EC2 AMI (latest Amazon Linux 2) ──────────────────────────────────────────

data "aws_ami" "al2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── IAM Role for EC2 ─────────────────────────────────────────────────────────

resource "aws_iam_role" "ec2" {
  name = "${local.prefix}-soc-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "ec2_sqs_s3" {
  name = "${local.prefix}-soc-sqs-s3"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:GetQueueUrl"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${var.alerts_bucket_arn}/*"
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.prefix}-soc-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ── User data rendered from template ─────────────────────────────────────────

locals {
  # Rendered script is ~40KB — gzip gets it well under EC2's 16KB user_data limit.
  # Amazon Linux 2 cloud-init decompresses gzip user_data transparently.
  user_data_rendered = templatefile("${path.module}/user_data.sh.tpl", {
    site_url           = var.site_url
    cognito_domain_url = var.cognito_domain_url
    soc_client_id      = var.soc_client_id
    soc_client_secret  = var.soc_client_secret
    sqs_queue_url      = var.sqs_queue_url
    aws_region         = var.aws_region
  })
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────

resource "aws_instance" "soc" {
  ami                         = data.aws_ami.al2.id
  instance_type               = var.instance_type
  subnet_id                   = var.public_subnet_ids[0]
  vpc_security_group_ids      = [var.ec2_sg_id]
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = true
  key_name                    = var.key_pair_name
  user_data_base64            = base64gzip(local.user_data_rendered)
  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true
  }

  tags = { Name = "${local.prefix}-soc-backend" }

  lifecycle {
    ignore_changes = [
      # Don't replace instance when AMI updates — only on explicit changes
      ami,
    ]
  }
}

# ── ALB (optional — default off, saves ~$18/month) ────────────────────────────

resource "aws_lb" "soc" {
  count              = var.create_alb ? 1 : 0
  name               = "${local.prefix}-soc-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  tags = { Name = "${local.prefix}-soc-alb" }
}

# ── Target groups ─────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "thehive" {
  count    = var.create_alb ? 1 : 0
  name     = "${local.prefix}-thehive-tg"
  port     = 9000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/thehive/login"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 5
    matcher             = "200-499"
  }

  tags = { Name = "${local.prefix}-thehive-tg" }
}

resource "aws_lb_target_group" "grafana" {
  count    = var.create_alb ? 1 : 0
  name     = "${local.prefix}-grafana-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/grafana/login"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 5
    matcher             = "200-499"
  }

  tags = { Name = "${local.prefix}-grafana-tg" }
}

resource "aws_lb_target_group_attachment" "thehive" {
  count            = var.create_alb ? 1 : 0
  target_group_arn = aws_lb_target_group.thehive[0].arn
  target_id        = aws_instance.soc.id
  port             = 9000
}

resource "aws_lb_target_group_attachment" "grafana" {
  count            = var.create_alb ? 1 : 0
  target_group_arn = aws_lb_target_group.grafana[0].arn
  target_id        = aws_instance.soc.id
  port             = 3000
}

# ── ALB HTTPS listener + ACM cert (custom_domain + ALB only) ─────────────────

resource "aws_acm_certificate" "alb" {
  count = var.create_alb && var.enable_custom_domain ? 1 : 0

  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.prefix}-alb-cert" }
}

resource "aws_route53_record" "alb_cert_validation" {
  for_each = (
    var.create_alb && var.enable_custom_domain && var.hosted_zone_id != null
    ? toset(["api.${var.domain_name}"])
    : toset([])
  )

  zone_id = var.hosted_zone_id
  name    = { for dvo in aws_acm_certificate.alb[0].domain_validation_options : dvo.domain_name => dvo.resource_record_name }[each.key]
  type    = { for dvo in aws_acm_certificate.alb[0].domain_validation_options : dvo.domain_name => dvo.resource_record_type }[each.key]
  records = [{ for dvo in aws_acm_certificate.alb[0].domain_validation_options : dvo.domain_name => dvo.resource_record_value }[each.key]]
  ttl     = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "alb" {
  count = var.create_alb && var.enable_custom_domain && var.hosted_zone_id != null ? 1 : 0

  certificate_arn         = aws_acm_certificate.alb[0].arn
  validation_record_fqdns = [for r in aws_route53_record.alb_cert_validation : r.fqdn]
}

# ── HTTP listener ─────────────────────────────────────────────────────────────

resource "aws_lb_listener" "http" {
  count             = var.create_alb ? 1 : 0
  load_balancer_arn = aws_lb.soc[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "SentinelNet SOC"
      status_code  = "200"
    }
  }
}

resource "aws_lb_listener_rule" "thehive_http" {
  count        = var.create_alb ? 1 : 0
  listener_arn = aws_lb_listener.http[0].arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.thehive[0].arn
  }

  condition {
    path_pattern {
      values = ["/thehive", "/thehive/*"]
    }
  }
}

resource "aws_lb_listener_rule" "grafana_http" {
  count        = var.create_alb ? 1 : 0
  listener_arn = aws_lb_listener.http[0].arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grafana[0].arn
  }

  condition {
    path_pattern {
      values = ["/grafana", "/grafana/*"]
    }
  }
}

# ── HTTPS listener (custom_domain + ALB only, with Cognito auth) ──────────────

resource "aws_lb_listener" "https" {
  count = var.create_alb && var.enable_custom_domain ? 1 : 0

  load_balancer_arn = aws_lb.soc[0].arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.alb[0].arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }

  depends_on = [aws_acm_certificate_validation.alb]
}

resource "aws_lb_listener_rule" "thehive_https" {
  count        = var.create_alb && var.enable_custom_domain ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 10

  action {
    order = 1
    type  = "authenticate-cognito"
    authenticate_cognito {
      user_pool_arn              = var.user_pool_arn
      user_pool_client_id        = var.soc_client_id
      user_pool_domain           = var.user_pool_domain
      on_unauthenticated_request = "authenticate"
    }
  }

  action {
    order            = 2
    type             = "forward"
    target_group_arn = aws_lb_target_group.thehive[0].arn
  }

  condition {
    path_pattern {
      values = ["/thehive", "/thehive/*"]
    }
  }
}

resource "aws_lb_listener_rule" "grafana_https" {
  count        = var.create_alb && var.enable_custom_domain ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 20

  action {
    order = 1
    type  = "authenticate-cognito"
    authenticate_cognito {
      user_pool_arn              = var.user_pool_arn
      user_pool_client_id        = var.soc_client_id
      user_pool_domain           = var.user_pool_domain
      on_unauthenticated_request = "authenticate"
    }
  }

  action {
    order            = 2
    type             = "forward"
    target_group_arn = aws_lb_target_group.grafana[0].arn
  }

  condition {
    path_pattern {
      values = ["/grafana", "/grafana/*"]
    }
  }
}

# Route 53 alias for api.domain (custom_domain + ALB mode)
resource "aws_route53_record" "alb_alias" {
  count   = var.create_alb && var.enable_custom_domain && var.hosted_zone_id != null ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.soc[0].dns_name
    zone_id                = aws_lb.soc[0].zone_id
    evaluate_target_health = true
  }
}

# ── Direct-access rules when ALB is disabled ──────────────────────────────────

resource "aws_security_group_rule" "ec2_thehive_direct" {
  count             = var.create_alb ? 0 : 1
  type              = "ingress"
  from_port         = 9000
  to_port           = 9000
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = var.ec2_sg_id
  description       = "TheHive direct (no ALB)"
}

resource "aws_security_group_rule" "ec2_grafana_direct" {
  count             = var.create_alb ? 0 : 1
  type              = "ingress"
  from_port         = 3000
  to_port           = 3000
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = var.ec2_sg_id
  description       = "Grafana direct (no ALB)"
}

# ── Wazuh Ingest Lambda (SQS → S3 data lake) ─────────────────────────────────

data "archive_file" "wazuh_ingest" {
  type        = "zip"
  source_dir  = var.wazuh_ingest_lambda_dir
  output_path = "${path.module}/wazuh_ingest.zip"
}

resource "aws_iam_role" "wazuh_ingest" {
  name = "${local.prefix}-wazuh-ingest-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "wazuh_ingest_basic" {
  role       = aws_iam_role.wazuh_ingest.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "wazuh_ingest_sqs_s3" {
  name = "${local.prefix}-wazuh-ingest-perms"
  role = aws_iam_role.wazuh_ingest.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${var.alerts_bucket_arn}/*"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "wazuh_ingest" {
  name              = "/aws/lambda/${local.prefix}-wazuh-ingest"
  retention_in_days = 7
}

resource "aws_lambda_function" "wazuh_ingest" {
  function_name    = "${local.prefix}-wazuh-ingest"
  role             = aws_iam_role.wazuh_ingest.arn
  handler          = "handler.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.wazuh_ingest.output_path
  source_code_hash = data.archive_file.wazuh_ingest.output_base64sha256
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      ALERTS_BUCKET_NAME = var.alerts_bucket_name
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.wazuh_ingest,
    aws_iam_role_policy_attachment.wazuh_ingest_basic,
  ]
}

resource "aws_lambda_event_source_mapping" "wazuh_sqs" {
  event_source_arn        = var.sqs_queue_arn
  function_name           = aws_lambda_function.wazuh_ingest.arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
  enabled                 = true
}
