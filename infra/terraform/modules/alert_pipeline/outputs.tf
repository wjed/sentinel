output "queue_url" {
  value = aws_sqs_queue.alerts.id
}

output "queue_arn" {
  value = aws_sqs_queue.alerts.arn
}

output "dlq_url" {
  value = aws_sqs_queue.alerts_dlq.id
}

output "dlq_arn" {
  value = aws_sqs_queue.alerts_dlq.arn
}

output "alerts_bucket_name" {
  value = aws_s3_bucket.alerts.id
}

output "alerts_bucket_arn" {
  value = aws_s3_bucket.alerts.arn
}
