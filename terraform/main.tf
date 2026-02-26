module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  aws_region   = var.aws_region
}

module "security" {
  source = "./modules/security"

  project_name     = var.project_name
  vpc_id           = module.vpc.vpc_id
  allowed_ssh_cidr = var.allowed_ssh_cidr
}

module "rds" {
  source = "./modules/rds"

  project_name      = var.project_name
  instance_class    = "db.t4g.micro"
  db_username       = var.db_username
  db_password       = var.db_password
  subnet_ids        = [module.vpc.public_subnet_1_id, module.vpc.public_subnet_2_id]
  security_group_id = module.security.rds_sg_id
}

module "ec2" {
  source = "./modules/ec2"

  project_name      = var.project_name
  instance_type     = "t3.micro"
  key_name          = var.ec2_key_name
  subnet_id         = module.vpc.public_subnet_1_id
  security_group_id = module.security.ec2_sg_id
  db_host           = module.rds.address
  db_password       = var.db_password
}
