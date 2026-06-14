# Infrastructure-as-Code (extrait) — bucket S3 du compte PCE Corp.
# Contexte de l'audit CIS 2.1.5 : le Block Public Access au niveau du COMPTE est
# désactivé (account-config.json), ce qui rend ce réglage par-bucket insuffisant.
# La remédiation attendue se fait dans account-config.json (accountLevel = true).

resource "aws_s3_bucket" "reports" {
  bucket = "pce-corp-quarterly-reports"
}

# NOTE: ce bloc par-bucket existe, mais le garde-fou DOIT aussi être posé au
# niveau du compte (aws_s3_account_public_access_block) — voir CIS 2.1.5.
resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Garde-fou au niveau du compte — actuellement NON appliqué (cf. account-config).
# resource "aws_s3_account_public_access_block" "account" {
#   block_public_acls       = true
#   block_public_policy     = true
#   ignore_public_acls      = true
#   restrict_public_buckets = true
# }
