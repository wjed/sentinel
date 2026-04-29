locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ── Lambda zip packages ───────────────────────────────────────────────────────
# archive_file writes directly to the module directory (always exists).
# source_code_hash ensures Lambda is only updated when code actually changes.

data "archive_file" "profile_api" {
  type        = "zip"
  source_dir  = var.profile_lambda_dir
  output_path = "${path.module}/profile_api.zip"
}

data "archive_file" "admin_access_api" {
  type        = "zip"
  source_dir  = var.admin_access_lambda_dir
  output_path = "${path.module}/admin_access_api.zip"
}

data "archive_file" "telemetry_api" {
  type        = "zip"
  source_dir  = var.telemetry_lambda_dir
  output_path = "${path.module}/telemetry_api.zip"
}

# ── Shared IAM trust policy ───────────────────────────────────────────────────

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ── Profile API Lambda ────────────────────────────────────────────────────────

resource "aws_iam_role" "profile_api" {
  name               = "${local.prefix}-profile-api-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "profile_api_basic" {
  role       = aws_iam_role.profile_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "profile_api_data" {
  name = "${local.prefix}-profile-api-data"
  role = aws_iam_role.profile_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
        ]
        Resource = var.profiles_table_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${var.profile_pictures_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = var.profile_pictures_bucket_arn
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "profile_api" {
  name              = "/aws/lambda/${local.prefix}-profile-api"
  retention_in_days = 7
}

resource "aws_lambda_function" "profile_api" {
  function_name    = "${local.prefix}-profile-api"
  role             = aws_iam_role.profile_api.arn
  handler          = "handler.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.profile_api.output_path
  source_code_hash = data.archive_file.profile_api.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME     = var.profiles_table_name
      BUCKET_NAME    = var.profile_pictures_bucket_name
      ALLOWED_GROUPS = join(",", var.allowed_groups)
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.profile_api,
    aws_iam_role_policy_attachment.profile_api_basic,
  ]
}

# ── Profile HTTP API ──────────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "profile" {
  name          = "${local.prefix}-profile-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "PATCH", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "profile_cognito" {
  api_id           = aws_apigatewayv2_api.profile.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-auth"

  jwt_configuration {
    audience = [var.user_pool_client_id]
    issuer   = var.issuer_url
  }
}

resource "aws_apigatewayv2_integration" "profile" {
  api_id                 = aws_apigatewayv2_api.profile.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.profile_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "profile_get" {
  api_id             = aws_apigatewayv2_api.profile.id
  route_key          = "GET /profile"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.profile_cognito.id
  target             = "integrations/${aws_apigatewayv2_integration.profile.id}"
}

resource "aws_apigatewayv2_route" "profile_patch" {
  api_id             = aws_apigatewayv2_api.profile.id
  route_key          = "PATCH /profile"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.profile_cognito.id
  target             = "integrations/${aws_apigatewayv2_integration.profile.id}"
}

resource "aws_apigatewayv2_stage" "profile" {
  api_id      = aws_apigatewayv2_api.profile.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "profile_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.profile_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.profile.execution_arn}/*/*"
}

# ── Admin Access API Lambda ───────────────────────────────────────────────────

resource "aws_iam_role" "admin_access_api" {
  name               = "${local.prefix}-admin-access-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "admin_access_api_basic" {
  role       = aws_iam_role.admin_access_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "admin_access_api_cognito" {
  name = "${local.prefix}-admin-access-cognito"
  role = aws_iam_role.admin_access_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminListGroupsForUser",
        "cognito-idp:ListUsers",
        "cognito-idp:ListUsersInGroup",
      ]
      Resource = var.user_pool_arn
    }]
  })
}

resource "aws_cloudwatch_log_group" "admin_access_api" {
  name              = "/aws/lambda/${local.prefix}-admin-access-api"
  retention_in_days = 7
}

resource "aws_lambda_function" "admin_access_api" {
  function_name    = "${local.prefix}-admin-access-api"
  role             = aws_iam_role.admin_access_api.arn
  handler          = "handler.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.admin_access_api.output_path
  source_code_hash = data.archive_file.admin_access_api.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      USER_POOL_ID       = var.user_pool_id
      ADMIN_GROUP_NAME   = var.admin_group_name
      ANALYST_GROUP_NAME = var.analyst_group_name
      VIEWER_GROUP_NAME  = var.viewer_group_name
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.admin_access_api,
    aws_iam_role_policy_attachment.admin_access_api_basic,
  ]
}

# ── Admin Access HTTP API ─────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "admin_access" {
  name          = "${local.prefix}-admin-access-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "admin_access_cognito" {
  api_id           = aws_apigatewayv2_api.admin_access.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-auth"

  jwt_configuration {
    audience = [var.user_pool_client_id]
    issuer   = var.issuer_url
  }
}

resource "aws_apigatewayv2_integration" "admin_access" {
  api_id                 = aws_apigatewayv2_api.admin_access.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin_access_api.invoke_arn
  payload_format_version = "2.0"
}

locals {
  admin_routes = {
    "GET /admin/access/groups"     = "groups"
    "GET /admin/access/whoami"     = "whoami"
    "GET /admin/access/users"      = "users"
    "GET /admin/access/users/{id}" = "user-get"
    "POST /admin/access/grant"     = "grant"
    "POST /admin/access/revoke"    = "revoke"
  }
}

resource "aws_apigatewayv2_route" "admin_access" {
  for_each = local.admin_routes

  api_id             = aws_apigatewayv2_api.admin_access.id
  route_key          = each.key
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin_access_cognito.id
  target             = "integrations/${aws_apigatewayv2_integration.admin_access.id}"
}

resource "aws_apigatewayv2_stage" "admin_access" {
  api_id      = aws_apigatewayv2_api.admin_access.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "admin_access_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_access_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.admin_access.execution_arn}/*/*"
}

# ── Telemetry API Lambda ──────────────────────────────────────────────────────

resource "aws_iam_role" "telemetry_api" {
  name               = "${local.prefix}-telemetry-api-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "telemetry_api_basic" {
  role       = aws_iam_role.telemetry_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "telemetry_api_s3" {
  name = "${local.prefix}-telemetry-api-s3"
  role = aws_iam_role.telemetry_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${var.alerts_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = var.alerts_bucket_arn
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "telemetry_api" {
  name              = "/aws/lambda/${local.prefix}-telemetry-api"
  retention_in_days = 7
}

resource "aws_lambda_function" "telemetry_api" {
  function_name    = "${local.prefix}-telemetry-api"
  role             = aws_iam_role.telemetry_api.arn
  handler          = "handler.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.telemetry_api.output_path
  source_code_hash = data.archive_file.telemetry_api.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ALERTS_BUCKET_NAME = var.alerts_bucket_name
      ALLOWED_GROUPS     = join(",", var.allowed_groups)
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.telemetry_api,
    aws_iam_role_policy_attachment.telemetry_api_basic,
  ]
}

# ── Telemetry HTTP API ────────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "telemetry" {
  name          = "${local.prefix}-telemetry-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "telemetry_cognito" {
  api_id           = aws_apigatewayv2_api.telemetry.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-auth"

  jwt_configuration {
    audience = [var.user_pool_client_id]
    issuer   = var.issuer_url
  }
}

resource "aws_apigatewayv2_integration" "telemetry" {
  api_id                 = aws_apigatewayv2_api.telemetry.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.telemetry_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "telemetry_get" {
  api_id             = aws_apigatewayv2_api.telemetry.id
  route_key          = "GET /alerts"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.telemetry_cognito.id
  target             = "integrations/${aws_apigatewayv2_integration.telemetry.id}"
}

resource "aws_apigatewayv2_stage" "telemetry" {
  api_id      = aws_apigatewayv2_api.telemetry.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "telemetry_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.telemetry_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.telemetry.execution_arn}/*/*"
}
