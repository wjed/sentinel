locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ── CloudWatch log groups ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "soc_errors" {
  name              = "/sentinelnet/soc/errors"
  retention_in_days = 7

  tags = { Name = "${local.prefix}-soc-errors" }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/sentinelnet/${var.environment}/app"
  retention_in_days = 14

  tags = { Name = "${local.prefix}-app-logs" }
}

# ── Optional GuardDuty ────────────────────────────────────────────────────────

resource "aws_guardduty_detector" "main" {
  count  = var.enable_guardduty ? 1 : 0
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
  }

  tags = { Name = "${local.prefix}-guardduty" }
}
