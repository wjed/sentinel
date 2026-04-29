output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "website_url" {
  value = (
    var.enable_custom_domain
    ? "https://${var.domain_name}"
    : "https://${aws_cloudfront_distribution.main.domain_name}"
  )
}

output "distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "bucket_name" {
  value = aws_s3_bucket.website.id
}

output "bucket_arn" {
  value = aws_s3_bucket.website.arn
}
