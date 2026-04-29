locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ── VPC ───────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${local.prefix}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${local.prefix}-igw" }
}

# ── Public subnets (one per AZ) ───────────────────────────────────────────────

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${local.prefix}-public-${count.index + 1}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.prefix}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ── ALB security group ────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name        = "${local.prefix}-alb-sg"
  description = "SentinelNet ALB - allows HTTP/HTTPS from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.prefix}-alb-sg" }
}

# ── EC2 security group ────────────────────────────────────────────────────────

resource "aws_security_group" "ec2" {
  name        = "${local.prefix}-ec2-sg"
  description = "SentinelNet SOC EC2 - SSH + Wazuh ports + ALB traffic"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.prefix}-ec2-sg" }
}

# SSH from admin CIDRs
resource "aws_security_group_rule" "ec2_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = var.allowed_admin_cidrs
  security_group_id = aws_security_group.ec2.id
  description       = "SSH from admin CIDRs"
}

# Wazuh agent events
resource "aws_security_group_rule" "ec2_wazuh_tcp" {
  type              = "ingress"
  from_port         = 1514
  to_port           = 1514
  protocol          = "tcp"
  cidr_blocks       = var.wazuh_agent_cidrs
  security_group_id = aws_security_group.ec2.id
  description       = "Wazuh agent events"
}

resource "aws_security_group_rule" "ec2_wazuh_registration" {
  type              = "ingress"
  from_port         = 1515
  to_port           = 1515
  protocol          = "tcp"
  cidr_blocks       = var.wazuh_agent_cidrs
  security_group_id = aws_security_group.ec2.id
  description       = "Wazuh agent registration"
}

resource "aws_security_group_rule" "ec2_wazuh_api" {
  type              = "ingress"
  from_port         = 55000
  to_port           = 55000
  protocol          = "tcp"
  cidr_blocks       = var.wazuh_agent_cidrs
  security_group_id = aws_security_group.ec2.id
  description       = "Wazuh REST API"
}

# TheHive (9000) from ALB
resource "aws_security_group_rule" "ec2_thehive_from_alb" {
  type                     = "ingress"
  from_port                = 9000
  to_port                  = 9000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.ec2.id
  description              = "TheHive from ALB"
}

# Grafana (3000) from ALB
resource "aws_security_group_rule" "ec2_grafana_from_alb" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.ec2.id
  description              = "Grafana from ALB"
}
