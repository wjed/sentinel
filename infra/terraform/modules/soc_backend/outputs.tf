output "instance_id" {
  value = aws_instance.soc.id
}

output "public_ip" {
  value = aws_instance.soc.public_ip
}

output "alb_dns_name" {
  value = one(aws_lb.soc[*].dns_name)
}

output "alb_arn" {
  value = one(aws_lb.soc[*].arn)
}

output "thehive_direct_url" {
  description = "TheHive URL — via ALB when create_alb=true, direct EC2 IP otherwise."
  value = (
    var.create_alb
    ? "http://${one(aws_lb.soc[*].dns_name)}/thehive/"
    : "http://${aws_instance.soc.public_ip}:9000/thehive/"
  )
}

output "grafana_direct_url" {
  description = "Grafana URL — via ALB when create_alb=true, direct EC2 IP otherwise."
  value = (
    var.create_alb
    ? "http://${one(aws_lb.soc[*].dns_name)}/grafana/"
    : "http://${aws_instance.soc.public_ip}:3000/grafana/"
  )
}

output "wazuh_ingest_lambda_arn" {
  value = aws_lambda_function.wazuh_ingest.arn
}
