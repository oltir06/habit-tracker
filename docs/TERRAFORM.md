# Habit Tracker Infrastructure

This project uses Terraform to declare and manage its AWS infrastructure. 

## What's Included

The infrastructure consists of several modular components:
- **Networking (VPC)**: A custom VPC (`10.0.0.0/16`) spanning two public subnets in different Availability Zones, along with the required Internet Gateway and route tables.
- **Security**: Strict security groups. The EC2 instance allows incoming SSH, HTTP, and HTTPS traffic. The RDS database only accepts PostgreSQL connections (port 5432) originating from the EC2 security group.
- **Application Server (EC2)**: A `t3.micro` Ubuntu 22.04 LTS instance. It uses a custom user-data script to automatically install Docker, Nginx, and Redis on boot. An Elastic IP is attached so the public IP remains static.
- **Database (RDS)**: A PostgreSQL 14 instance running on `db.t4g.micro` with 20GB of encrypted storage.
- **State Management**: Terraform state is stored securely in an Amazon S3 bucket with versioning enabled, and state locking is handled via a DynamoDB table to prevent simultaneous deployments from causing overlap.

## Getting Started

To work with this Terraform configuration, you need the AWS CLI authenticated with credentials that have sufficient provisioning permissions, and Terraform (v1.6+) installed.

1. **Initialize the project**
   ```bash
   cd terraform
   terraform init
   ```
   *Note: If this is the very first time setting up the repository in a new AWS account, you'll need to create the S3 and DynamoDB resources first using `terraform apply -target=aws_s3_bucket.terraform_state` and `terraform apply -target=aws_dynamodb_table.terraform_locks` before running `terraform init -migrate-state`.*

2. **Configure your variables**
   Update the `terraform.tfvars` file with your specific values (e.g., your local IP for SSH access, and secure database credentials). Never commit the `terraform.tfvars` file to source control.

3. **Deploy**
   ```bash
   # See what Terraform plans to change
   terraform plan

   # Apply the changes to AWS
   terraform apply
   ```

## Workspaces

We use Terraform workspaces to separate state for different environments (e.g., staging vs default/production).
```bash
terraform workspace list
terraform workspace new [workspace_name]
terraform workspace select [workspace_name]
```

## Useful Commands

- `terraform output` - View the generated endpoints and IPs, such as the EC2 IP and the Database connection string.
- `terraform destroy` - Tear down all managed infrastructure. Use with extreme caution.
- `terraform force-unlock [LOCK_ID]` - Manually remove a DynamoDB state lock if a previous apply was interrupted.
