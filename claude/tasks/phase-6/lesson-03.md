# Lesson 3: AWS Infrastructure Setup

## 🎯 Goal
Set up AWS infrastructure for production deployment including EC2, RDS, and load balancing.

## 📚 What You'll Learn
- Configure EC2 instances
- Set up RDS PostgreSQL
- Configure load balancers
- Set up auto-scaling

## 📋 Prerequisites
- Completed Phase 6 Lessons 1-2
- AWS account with appropriate permissions
- Experience with AWS console or CLI

## 🛠️ Tasks

### 1. Create Infrastructure as Code (Terraform)

Create `infra/main.tf`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "saas-vpc"
  }
}

# Subnets
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "public-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "public-2"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "saas-igw"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-rt"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "saas-db-subnet-group"
  subnet_ids = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "saas-db-subnet-group"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier            = "saas-postgres"
  engine                = "postgres"
  engine_version        = "14.7"
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  db_name               = var.db_name
  username              = var.db_user
  password              = random_password.db_password.result
  db_subnet_group_name  = aws_db_subnet_group.main.name
  skip_final_snapshot   = false
  publicly_accessible   = false

  tags = {
    Name = "saas-postgres"
  }
}

# RDS Password
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "saas-redis-subnet-group"
  subnet_ids = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "saas-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name

  tags = {
    Name = "saas-redis"
  }
}

# Security Group
resource "aws_security_group" "alb" {
  name   = "saas-alb-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "saas-alb-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "saas-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "saas-alb"
  }
}

# Output values
output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}
```

### 2. Create Variables File

Create `infra/variables.tf`:

```hcl
variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "db_name" {
  description = "Database name"
  default     = "blog_platform"
}

variable "db_user" {
  description = "Database user"
  default     = "postgres"
}
```

## ✅ Verification Checklist

- [ ] VPC is created
- [ ] Public subnets in 2 AZs
- [ ] Internet Gateway attached
- [ ] RDS PostgreSQL instance running
- [ ] ElastiCache Redis cluster running
- [ ] Application Load Balancer created
- [ ] Security groups configured
- [ ] Database credentials secure
- [ ] Outputs show endpoints
- [ ] Infrastructure accessible

## 📚 Resources

- [Terraform AWS Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Architecture Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/userguide/welcome.html)
- [Infrastructure as Code](https://www.terraform.io/intro)
