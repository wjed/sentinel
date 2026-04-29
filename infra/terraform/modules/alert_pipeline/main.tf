locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ── S3: alerts data lake ──────────────────────────────────────────────────────

resource "aws_s3_bucket" "alerts" {
  bucket        = "${local.prefix}-alerts-datalake"
  force_destroy = var.force_destroy_buckets

  tags = { Name = "${local.prefix}-alerts-datalake" }
}

resource "aws_s3_bucket_public_access_block" "alerts" {
  bucket                  = aws_s3_bucket.alerts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alerts" {
  bucket = aws_s3_bucket.alerts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alerts" {
  count  = var.alert_retention_days > 0 ? 1 : 0
  bucket = aws_s3_bucket.alerts.id

  rule {
    id     = "alert-expiration"
    status = "Enabled"

    filter {}

    expiration {
      days = var.alert_retention_days
    }
  }
}

# ── SQS: dead-letter queue ────────────────────────────────────────────────────

resource "aws_sqs_queue" "alerts_dlq" {
  name                      = "${local.prefix}-alerts-dlq"
  message_retention_seconds = 1209600 # 14 days

  # Enforce HTTPS transport
  sqs_managed_sse_enabled = true

  tags = { Name = "${local.prefix}-alerts-dlq" }
}

# ── SQS: main alert queue ─────────────────────────────────────────────────────

resource "aws_sqs_queue" "alerts" {
  name                       = "${local.prefix}-alerts"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = 120

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.alerts_dlq.arn
    maxReceiveCount     = 5
  })

  sqs_managed_sse_enabled = true

  tags = { Name = "${local.prefix}-alerts" }
}

# Enforce SSL on both queues
resource "aws_sqs_queue_policy" "alerts" {
  queue_url = aws_sqs_queue.alerts.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "sqs:*"
      Resource  = aws_sqs_queue.alerts.arn
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}

resource "aws_sqs_queue_policy" "alerts_dlq" {
  queue_url = aws_sqs_queue.alerts_dlq.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "sqs:*"
      Resource  = aws_sqs_queue.alerts_dlq.arn
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}
