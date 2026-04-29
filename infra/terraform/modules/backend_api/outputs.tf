output "profile_api_url" {
  value = aws_apigatewayv2_stage.profile.invoke_url
}

output "admin_access_api_url" {
  value = aws_apigatewayv2_stage.admin_access.invoke_url
}

output "telemetry_api_url" {
  value = aws_apigatewayv2_stage.telemetry.invoke_url
}

output "profile_lambda_arn" {
  value = aws_lambda_function.profile_api.arn
}

output "admin_access_lambda_arn" {
  value = aws_lambda_function.admin_access_api.arn
}

output "telemetry_lambda_arn" {
  value = aws_lambda_function.telemetry_api.arn
}
