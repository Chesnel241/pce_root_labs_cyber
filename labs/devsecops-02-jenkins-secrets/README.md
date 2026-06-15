# Lab 3.1.1 — Secrets en clair dans Jenkins

**Track** : DevSecOps · **Module** 3.1 (Sécurité CI/CD) · **Difficulté** : moyenne
**Flag** : `PCE{jenkins_plaintext_aws_creds_2024}`

## Objectif

Le pipeline de déploiement du projet `pce-billing-api` stocke ses credentials
AWS **en clair** dans le `Jenkinsfile` (bloc `environment { }`) et dans le
`job-config.xml` du job (paramètres avec `defaultValue`). Récupérez le secret.

## Vulnérabilité

Mauvaise gestion des secrets CI/CD : au lieu d'utiliser le *Credentials Store*
de Jenkins (`withCredentials([...])`), les clés sont écrites en dur dans des
fichiers versionnés et lisibles par quiconque a accès au dépôt ou au master.

## Solution (chemin attendu)

```sh
cd /srv/jenkins
ls
cat Jenkinsfile
# Repérer le bloc environment { } : AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY...
grep -ri "AWS_SECRET" .
```

La valeur de `AWS_SECRET_ACCESS_KEY` est le flag :
`PCE{jenkins_plaintext_aws_creds_2024}`. Le même secret figure en
`defaultValue` du paramètre `AWS_SECRET_ACCESS_KEY` dans `job-config.xml`.

## Remédiation

- Stocker les secrets dans le *Credentials Store* Jenkins et y accéder via
  `withCredentials`.
- Interdire les `PasswordParameterDefinition` à valeur par défaut en clair.
- Scanner les pipelines (gitleaks/truffleHog) en pré-commit et en CI.
