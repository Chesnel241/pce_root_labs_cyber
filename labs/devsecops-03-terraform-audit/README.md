# Lab 3.2.1 — Audit Terraform (Infrastructure as Code)

**Track** : DevSecOps · **Module** 3.2 (Sécurité IaC) · **Difficulté** : moyenne
**Flag** : `PCE{terraform_five_misconfigs_2024}`

## Objectif

L'infrastructure Terraform du projet `pce-data-platform` (`/srv/terraform/main.tf`)
contient **5 catégories de misconfigurations** de sécurité AWS. Votre mission :
**auditer** le code, **détecter** chaque faille, puis apprendre à la **corriger**.
Identifier les 5 catégories (manuellement ou via le scanner) révèle le flag.

C'est un lab **défensif** (blue-team / audit IaC) : on ne déploie rien, on lit
le code et on remédie.

## Les 5 misconfigurations à détecter

| # | Catégorie | Ressource | Détail |
|---|-----------|-----------|--------|
| 1 | **S3 public** | `aws_s3_bucket.data_exports` | `acl = "public-read"` -> bucket exposé sur Internet |
| 2 | **SG ouvert** | `aws_security_group.app_sg` | `ingress { cidr_blocks = ["0.0.0.0/0"] }` sur SSH (22) et HTTP (80) |
| 3 | **Non chiffré** | `aws_instance.app_server` + buckets S3 | `root_block_device { encrypted = false }` et buckets sans SSE |
| 4 | **Secret en dur** | `aws_db_instance.billing_db` | `password = "Pr0d!Billing#2024"` codé dans le code (et dans le tfstate) |
| 5 | **RDS publique** | `aws_db_instance.billing_db` | `publicly_accessible = true` -> base exposée hors VPC |

## Solution (chemin attendu)

### Audit manuel (grep)

```sh
cd /srv/terraform
ls
cat main.tf

# 1. Bucket S3 public
grep -n "public-read" main.tf

# 2. Security group ouvert au monde
grep -n "0.0.0.0/0" main.tf

# 3. Stockage non chiffré
grep -nE "encrypted *= *false" main.tf      # volume EBS
grep -n  "server_side_encryption" main.tf    # absent => buckets non chiffrés

# 4. Secret codé en dur
grep -niE "password|secret|token" main.tf

# 5. Base RDS publiquement accessible
grep -n "publicly_accessible *= *true" main.tf
```

### Audit automatique (scanner fourni)

```sh
python3 /usr/local/bin/tf-audit.py .
```

Quand les **5 catégories** sont détectées (`5/5`), le scanner affiche :

```
  Misconfigurations detectees : 5/5
  Drapeau du lab : PCE{terraform_five_misconfigs_2024}
```

## Remédiation (fix de chaque finding)

1. **S3 public** — retirer l'ACL publique et bloquer l'accès public :
   ```hcl
   resource "aws_s3_bucket" "data_exports" {
     bucket = "pce-data-platform-exports"
   }
   resource "aws_s3_bucket_public_access_block" "data_exports" {
     bucket                  = aws_s3_bucket.data_exports.id
     block_public_acls       = true
     block_public_policy     = true
     ignore_public_acls      = true
     restrict_public_buckets = true
   }
   ```

2. **SG ouvert** — restreindre `cidr_blocks` aux plages internes connues
   (ex. le CIDR du VPC ou un bastion), jamais `0.0.0.0/0` sur SSH.
   ```hcl
   ingress {
     from_port   = 22
     to_port     = 22
     protocol    = "tcp"
     cidr_blocks = ["10.0.0.0/16"]
   }
   ```

3. **Non chiffré** — chiffrer le volume EBS et activer la SSE sur les buckets :
   ```hcl
   root_block_device {
     encrypted  = true
     kms_key_id = aws_kms_key.app.arn
   }

   resource "aws_s3_bucket_server_side_encryption_configuration" "raw_ingest" {
     bucket = aws_s3_bucket.raw_ingest.id
     rule {
       apply_server_side_encryption_by_default {
         sse_algorithm = "aws:kms"
       }
     }
   }
   ```

4. **Secret en dur** — utiliser une variable sensible alimentée par un
   gestionnaire de secrets, jamais une valeur littérale :
   ```hcl
   variable "db_password" {
     type      = string
     sensitive = true
   }
   resource "aws_db_instance" "billing_db" {
     password = var.db_password   # via AWS Secrets Manager / TF_VAR_db_password
   }
   ```

5. **RDS publique** — désactiver l'accès public, garder la base dans le VPC
   privé :
   ```hcl
   resource "aws_db_instance" "billing_db" {
     publicly_accessible = false
   }
   ```

## Bonnes pratiques IaC

- Intégrer un scanner statique (tfsec, checkov, terrascan) en pré-commit et en CI.
- Activer le chiffrement par défaut au niveau du compte/organisation.
- Bannir les secrets littéraux : `git`-secrets / gitleaks + Secrets Manager.
- Revue de code obligatoire sur tout changement d'infrastructure.

## Flag

`PCE{terraform_five_misconfigs_2024}`
