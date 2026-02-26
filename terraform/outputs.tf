output "ec2_public_ip" {
  description = "EC2 instance public IP"
  value       = module.ec2.public_ip
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "connection_command" {
  description = "SSH connection command"
  value       = "ssh -i ${var.ec2_key_name}.pem ubuntu@${module.ec2.public_ip}"
}

output "database_connection" {
  description = "Database connection string"
  value       = "postgresql://${var.db_username}:****@${module.rds.address}:${module.rds.port}/${module.rds.db_name}"
}
