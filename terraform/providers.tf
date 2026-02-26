terraform {
  required_version = ">= 1.6"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket         = "habit-tracker-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "eu-north-1"
    encrypt        = true
    dynamodb_table = "habit-tracker-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Habit Tracker API"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
