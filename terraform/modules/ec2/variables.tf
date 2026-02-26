variable "project_name" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

variable "key_name" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "security_group_id" {
  type = string
}

variable "db_host" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}
