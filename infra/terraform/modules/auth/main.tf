locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ── Cognito User Pool ─────────────────────────────────────────────────────────

resource "aws_cognito_user_pool" "main" {
  name = "${local.prefix}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  tags = { Name = "${local.prefix}-user-pool" }

  lifecycle {
    ignore_changes = [name]
  }
}

# ── Cognito Domain (hosted UI) ────────────────────────────────────────────────

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# ── Cognito Groups ────────────────────────────────────────────────────────────

resource "aws_cognito_user_group" "admins" {
  name         = var.admin_group_name
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "SentinelNet administrators - full access including group management"
  precedence   = 1
}

resource "aws_cognito_user_group" "analysts" {
  name         = var.analyst_group_name
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "SentinelNet security analysts - read/write access to incidents and alerts"
  precedence   = 2
}

resource "aws_cognito_user_group" "viewers" {
  name         = var.viewer_group_name
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "SentinelNet read-only viewers"
  precedence   = 3
}

# ── Web App Client (React frontend) ──────────────────────────────────────────
# No client secret — SPAs use PKCE, not client credentials.

resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  depends_on = [aws_cognito_user_pool_domain.main]
}

# ── SOC Services Client (TheHive + Grafana + ALB Cognito auth) ────────────────
# Used by services that need a client secret for server-side OIDC flows.

resource "aws_cognito_user_pool_client" "soc" {
  name         = "${local.prefix}-soc-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = length(var.soc_callback_urls) > 0 ? var.soc_callback_urls : ["http://localhost:3000/"]
  logout_urls   = length(var.soc_callback_urls) > 0 ? var.soc_callback_urls : ["http://localhost:3000/"]

  depends_on = [aws_cognito_user_pool_domain.main]
}

# ── Default test user ─────────────────────────────────────────────────────────

resource "aws_cognito_user" "default_admin" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = var.default_admin_username

  attributes = {
    email          = var.default_admin_email
    email_verified = "true"
  }

  password       = var.default_admin_password
  message_action = "SUPPRESS"
}

resource "aws_cognito_user_in_group" "default_admin" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = aws_cognito_user.default_admin.username
  group_name   = aws_cognito_user_group.admins.name
}
