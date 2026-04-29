output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.main.arn
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "user_pool_domain" {
  value = aws_cognito_user_pool_domain.main.domain
}

output "cognito_domain_url" {
  value = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "issuer_url" {
  value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "soc_client_id" {
  value = aws_cognito_user_pool_client.soc.id
}

output "soc_client_secret" {
  value     = aws_cognito_user_pool_client.soc.client_secret
  sensitive = true
}

output "admin_group_name" {
  value = aws_cognito_user_group.admins.name
}

output "analyst_group_name" {
  value = aws_cognito_user_group.analysts.name
}

output "viewer_group_name" {
  value = aws_cognito_user_group.viewers.name
}
