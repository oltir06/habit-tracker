variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "habit-tracker"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "ec2_key_name" {
  description = "EC2 SSH key pair name"
  type        = string
  default     = "my-aws-key"
}

variable "domain_name" {
  description = "Domain name"
  type        = string
  default     = "habittrackerapi.me"
}

variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # We can change this later for security
}
