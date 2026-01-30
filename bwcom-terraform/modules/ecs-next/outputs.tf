output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "route53_record_name" {
  description = "Route53 record name"
  value       = aws_route53_record.next.name
}