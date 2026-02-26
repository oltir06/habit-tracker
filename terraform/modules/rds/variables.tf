variable "project_name" {
  type = string
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}
