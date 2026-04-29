output "profiles_table_name" {
  value = aws_dynamodb_table.profiles.name
}

output "profiles_table_arn" {
  value = aws_dynamodb_table.profiles.arn
}

output "profile_pictures_bucket_name" {
  value = aws_s3_bucket.profile_pictures.id
}

output "profile_pictures_bucket_arn" {
  value = aws_s3_bucket.profile_pictures.arn
}
