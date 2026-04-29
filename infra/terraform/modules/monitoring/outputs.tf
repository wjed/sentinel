output "soc_errors_log_group" {
  value = aws_cloudwatch_log_group.soc_errors.name
}

output "app_log_group" {
  value = aws_cloudwatch_log_group.app.name
}
