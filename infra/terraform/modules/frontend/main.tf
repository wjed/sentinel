terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ── S3: private static website bucket ────────────────────────────────────────

resource "aws_s3_bucket" "website" {
  bucket        = "${local.prefix}-website"
  force_destroy = var.force_destroy

  tags = { Name = "${local.prefix}-website" }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ── CloudFront Origin Access Control ──────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${local.prefix}-oac"
  description                       = "OAC for SentinelNet website bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontServicePrincipal"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.website.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })

  depends_on = [aws_cloudfront_distribution.main]
}

# ── ACM certificate (us-east-1, required by CloudFront) ──────────────────────

resource "aws_acm_certificate" "site" {
  count    = var.enable_custom_domain ? 1 : 0
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.prefix}-site-cert" }
}

# DNS validation records in Route 53 (only when create_route53_records = true)
resource "aws_route53_record" "cert_validation" {
  for_each = (
    var.enable_custom_domain && var.create_route53_records
    ? toset([var.domain_name, "www.${var.domain_name}"])
    : toset([])
  )

  zone_id = var.hosted_zone_id
  name    = { for dvo in aws_acm_certificate.site[0].domain_validation_options : dvo.domain_name => dvo.resource_record_name }[each.key]
  type    = { for dvo in aws_acm_certificate.site[0].domain_validation_options : dvo.domain_name => dvo.resource_record_type }[each.key]
  records = [{ for dvo in aws_acm_certificate.site[0].domain_validation_options : dvo.domain_name => dvo.resource_record_value }[each.key]]
  ttl     = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  count    = var.enable_custom_domain && var.create_route53_records ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ── CloudFront distribution ───────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  comment = "${local.prefix} website"

  # Ensure ACM cert is validated before CloudFront tries to use it.
  # No-op when enable_custom_domain = false (count = 0 on validation resource).
  depends_on = [aws_acm_certificate_validation.site]

  # Custom domain aliases (only in custom_domain mode)
  aliases = (
    var.enable_custom_domain
    ? [var.domain_name, "www.${var.domain_name}"]
    : []
  )

  # Custom ACM cert (only in custom_domain mode).
  # minimum_protocol_version is only valid when ssl_support_method is set
  # (i.e. not when using the default CloudFront certificate).
  viewer_certificate {
    cloudfront_default_certificate = var.enable_custom_domain ? false : true
    acm_certificate_arn            = var.enable_custom_domain ? aws_acm_certificate.site[0].arn : null
    ssl_support_method             = var.enable_custom_domain ? "sni-only" : null
    minimum_protocol_version       = var.enable_custom_domain ? "TLSv1.2_2021" : null
  }

  # ── Default behavior: S3 origin for React app ─────────────────────────────
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "s3-website"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-website"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # ── ALB origin for SOC services (only when soc_alb_dns is set) ────────────
  dynamic "origin" {
    for_each = var.soc_alb_dns != null ? [var.soc_alb_dns] : []
    content {
      domain_name = origin.value
      origin_id   = "alb-soc"

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  # /thehive  and /thehive/* → ALB
  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/thehive"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = false

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization", "Accept"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/thehive/*"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = false

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization", "Accept"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  # /grafana and /grafana/* → ALB
  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/grafana"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = false

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization", "Accept"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/grafana/*"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = false

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization", "Accept"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  # /wazuh and /wazuh/* → ALB (Wazuh Dashboard)
  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/wazuh"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = false

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization", "Accept"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/wazuh/*"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = false

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization", "Accept"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  # /api/dashboard and /api/dashboard/* → ALB (dashboard-api container)
  # The dashboard-api validates the Cognito Bearer token in-app, so the
  # Authorization header must be forwarded.
  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/api/dashboard"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization", "Accept"]
        cookies {
          forward = "none"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/api/dashboard/*"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization", "Accept"]
        cookies {
          forward = "none"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  # /oauth2/idpresponse → ALB (for ALB Cognito auth relay)
  dynamic "ordered_cache_behavior" {
    for_each = var.soc_alb_dns != null ? ["/oauth2/idpresponse"] : []
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "alb-soc"
      viewer_protocol_policy = "https-only"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = false

      forwarded_values {
        query_string = true
        headers      = ["Host", "Origin", "Authorization"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  # SPA routing: convert S3 403/404 → 200 /index.html for React Router
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = { Name = "${local.prefix}-distribution" }
}

# ── Route 53 records (custom_domain mode only) ────────────────────────────────

resource "aws_route53_record" "apex_a" {
  count   = var.enable_custom_domain && var.create_route53_records ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  count   = var.enable_custom_domain && var.create_route53_records ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_a" {
  count   = var.enable_custom_domain && var.create_route53_records ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
