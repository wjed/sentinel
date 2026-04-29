locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ── DynamoDB: user profiles ───────────────────────────────────────────────────

resource "aws_dynamodb_table" "profiles" {
  name         = "${local.prefix}-profiles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = { Name = "${local.prefix}-profiles" }
}

# ── S3: profile pictures ──────────────────────────────────────────────────────

resource "aws_s3_bucket" "profile_pictures" {
  bucket        = "${local.prefix}-profile-pictures"
  force_destroy = var.force_destroy

  tags = { Name = "${local.prefix}-profile-pictures" }
}

resource "aws_s3_bucket_public_access_block" "profile_pictures" {
  bucket = aws_s3_bucket.profile_pictures.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "profile_pictures" {
  bucket = aws_s3_bucket.profile_pictures.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "profile_pictures" {
  bucket = aws_s3_bucket.profile_pictures.id
  versioning_configuration {
    status = "Suspended"
  }
}

# CORS — Lambda generates pre-signed URLs; browser accesses S3 directly
resource "aws_s3_bucket_cors_configuration" "profile_pictures" {
  bucket = aws_s3_bucket.profile_pictures.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
