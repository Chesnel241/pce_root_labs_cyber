# =============================================================================
# pce-data-platform — infrastructure Terraform (AWS)
#
# AVERTISSEMENT (volontaire) : ce fichier contient PLUSIEURS mauvaises
# configurations de sécurité à des fins pédagogiques. NE PAS déployer.
# L'objectif du lab est de DÉTECTER ces misconfigurations puis de les CORRIGER.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-west-3"
}

# -----------------------------------------------------------------------------
# [MISCONFIG #1] Bucket S3 avec ACL "public-read" -> exposition publique.
# Remédiation : acl = "private" + aws_s3_bucket_public_access_block.
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "data_exports" {
  bucket = "pce-data-platform-exports"
  acl    = "public-read"

  tags = {
    Name        = "pce-data-platform-exports"
    Environment = "production"
  }
}

# -----------------------------------------------------------------------------
# [MISCONFIG #2] Bucket S3 sans chiffrement au repos (aucun
# server_side_encryption_configuration). Remédiation : activer SSE (aws:kms
# ou AES256).
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "raw_ingest" {
  bucket = "pce-data-platform-raw-ingest"

  tags = {
    Name        = "pce-data-platform-raw-ingest"
    Environment = "production"
  }
}

# -----------------------------------------------------------------------------
# [MISCONFIG #3] Security group autorisant l'ingress depuis 0.0.0.0/0 sur SSH
# (22) et tout le reste : surface d'attaque ouverte à l'Internet entier.
# Remédiation : restreindre cidr_blocks à des plages internes connues.
# -----------------------------------------------------------------------------
resource "aws_security_group" "app_sg" {
  name        = "pce-app-sg"
  description = "Security group de l'application pce-data-platform"
  vpc_id      = "vpc-0abc1234def567890"

  ingress {
    description = "SSH ouvert au monde entier"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
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
    Name = "pce-app-sg"
  }
}

# -----------------------------------------------------------------------------
# [MISCONFIG #4] Volume EBS de l'instance non chiffré (encrypted = false).
# Remédiation : encrypted = true (+ kms_key_id pour une CMK).
# -----------------------------------------------------------------------------
resource "aws_instance" "app_server" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
    encrypted   = false
  }

  tags = {
    Name        = "pce-app-server"
    Environment = "production"
  }
}

# -----------------------------------------------------------------------------
# [MISCONFIG #5] Base RDS accessible publiquement (publicly_accessible = true).
# Remédiation : publicly_accessible = false (la base reste dans le VPC privé).
# -----------------------------------------------------------------------------
resource "aws_db_instance" "billing_db" {
  identifier          = "pce-billing-db"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.medium"
  allocated_storage   = 100
  db_name             = "billing"
  username            = "billing_admin"

  # [MISCONFIG #6 — secret en dur] Mot de passe maître codé EN DUR dans le
  # code Terraform (sera aussi visible dans l'état tfstate).
  # Remédiation : utiliser une variable sensible + un secret manager.
  password = "Pr0d!Billing#2024"

  publicly_accessible = true
  skip_final_snapshot = true

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  tags = {
    Name        = "pce-billing-db"
    Environment = "production"
  }
}
