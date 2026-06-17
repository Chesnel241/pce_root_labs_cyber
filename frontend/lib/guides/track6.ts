import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  "6.1.1": {
    context: "Votre entreprise a déployé une architecture réseau sur le Cloud. Cependant, l'équipe de sécurité a signalé que le sous-réseau de la base de données (private_db_subnet) est exposé directement à Internet via une mauvaise configuration de sa table de routage.",
    objective: "Inspecter et modifier le fichier 'vpc_config.json' pour supprimer l'accès direct à Internet via l'Internet Gateway.",
    concepts: ["VPC", "Subnets", "Routing Table", "Internet Gateway", "Segmentation"],
    steps: [
      {
        title: "Inspection de la configuration",
        detail: "Examinez le fichier vpc_config.json pour identifier la route vers l'Internet Gateway (igw-).",
        command: "cat vpc_config.json"
      },
      {
        title: "Correction de la configuration",
        detail: "Supprimez la route pointant vers l'Internet Gateway pour isoler le sous-réseau privé.",
        command: "sed -i '/igw-/d' vpc_config.json"
      },
      {
        title: "Validation et obtention du flag",
        detail: "Le script de validation vérifiera l'absence de route vers l'IGW. Le flag attendu est **PCE{vpc_segmentation_fixed_2024}**.",
        command: "./validate.py"
      }
    ]
  },
  "6.1.2": {
    context: "Vous auditez le Security Group du tier web 'PCE Corp'. Une règle d'entrée (ingress) ouvre 0.0.0.0/0 (tout Internet) sur TOUS les ports, ce qui représente une exposition maximale.",
    objective: "Réécrire la règle en MOINDRE EXPOSITION (un seul port utile, un protocole précis, un CIDR de confiance).",
    concepts: ["Security Groups", "Least Privilege", "Network Exposure", "Ingress/Egress"],
    steps: [
      {
        title: "Inspection de la configuration",
        detail: "Examinez les règles actuelles du Security Group.",
        command: "cat security-group.json"
      },
      {
        title: "Lancer l'audit",
        detail: "Utilisez le script d'audit pour identifier les failles.",
        command: "python3 sg-audit.py"
      },
      {
        title: "Correction",
        detail: "Modifiez le fichier security-group.json pour restreindre le protocole à TCP, le port à 443, et l'IP source à un réseau spécifique (ex. 10.0.0.0/16).",
        command: "sed -i 's/\"0.0.0.0\\/0\"/\"10.0.0.0\\/16\"/' security-group.json; sed -i 's/\"-1\"/\"tcp\"/' security-group.json; sed -i 's/\"fromPort\": 0/\"fromPort\": 443/' security-group.json; sed -i 's/\"toPort\": 65535/\"toPort\": 443/' security-group.json"
      },
      {
        title: "Relancer l'audit et obtention du flag",
        detail: "L'audit confirmera que la configuration respecte le principe de moindre exposition. Le flag attendu est **PCE{security_group_least_exposure_2024}**.",
        command: "python3 sg-audit.py"
      }
    ]
  },
  "6.1.3": {
    context: "Vous devez accéder à un serveur de base de données interne non exposé à Internet. L'architecture utilise un Bastion Host n'acceptant que les connexions SSH depuis le VPN d'entreprise.",
    objective: "Se connecter au VPN, accéder au Bastion Host et récupérer le flag depuis le serveur interne.",
    concepts: ["Bastion Host", "VPN", "Network Access Control"],
    steps: [
      {
        title: "Connexion au VPN",
        detail: "Utilisez le client VPN mock fourni pour vous connecter au réseau d'entreprise.",
        command: "./vpn-client.py connect"
      },
      {
        title: "Connexion au Bastion et obtention du flag",
        detail: "Connectez-vous au Bastion Host via SSH pour récupérer le flag depuis le serveur interne. Le flag attendu est **PCE{bastion_vpn_secured_2026}**.",
        command: "./ssh-bastion.py"
      }
    ]
  },
  "6.1.4": {
    context: "Votre mission est de configurer les règles d'un Web Application Firewall (WAF) pour protéger une application web contre les injections SQL (SQLi) et les attaques Cross-Site Scripting (XSS).",
    objective: "Compléter les expressions régulières du WAF sans bloquer le trafic légitime.",
    concepts: ["WAF", "SQL Injection", "Cross-Site Scripting (XSS)", "Regular Expressions"],
    steps: [
      {
        title: "Écriture des règles WAF",
        detail: "Remplissez le fichier waf_rules.py avec des expressions régulières pour détecter SQLi et XSS.",
        command: "cat << 'EOF' > waf_rules.py\nimport re\nSQLI_REGEX = r\"(?:'|--|;|\\b(?:UNION|SELECT|DROP)\\b)\"\nXSS_REGEX = r\"(?:<script>|onerror|javascript:|onload)\"\ndef is_malicious(payload: str) -> bool:\n    if not payload: return False\n    if SQLI_REGEX and re.search(SQLI_REGEX, payload, re.IGNORECASE): return True\n    if XSS_REGEX and re.search(XSS_REGEX, payload, re.IGNORECASE): return True\n    return False\nEOF"
      },
      {
        title: "Test du WAF et obtention du flag",
        detail: "Lancez les tests pour vérifier que le WAF bloque les attaques mais autorise le trafic légitime. Le flag attendu est **PCE{waf_rules_designed_2024}**.",
        command: "./test_waf.py"
      }
    ]
  },
  "6.2.1": {
    context: "Vous auditez la policy IAM attachée au rôle applicatif 'PCE Corp' pce-report-uploader. Le Statement accorde Action:'*' sur Resource:'*' (équivalent AdministratorAccess).",
    objective: "Réécrire la policy en MOINDRE PRIVILEGE (actions explicites et ressources scopées à un ARN précis).",
    concepts: ["IAM", "Least Privilege", "IAM Policies"],
    steps: [
      {
        title: "Inspection de la policy",
        detail: "Vérifiez le contenu de la policy IAM vulnérable.",
        command: "cat iam-policy.json"
      },
      {
        title: "Lancer l'audit initial",
        detail: "Vérifiez le non-respect du principe de moindre privilège.",
        command: "python3 policy-audit.py"
      },
      {
        title: "Correction de la policy",
        detail: "Remplacez les wildcards par des permissions spécifiques.",
        command: "sed -i 's/\"Action\": \"\\*\"/\"Action\": [\"s3:GetObject\", \"s3:PutObject\"]/' iam-policy.json; sed -i 's/\"Resource\": \"\\*\"/\"Resource\": \"arn:aws:s3:::pce-corp-reports\\/\\*\"/' iam-policy.json"
      },
      {
        title: "Validation et obtention du flag",
        detail: "Le script de conformité vérifiera l'absence de permissions globales. Le flag attendu est **PCE{least_privilege_scoped_policy_2024}**.",
        command: "python3 policy-audit.py"
      }
    ]
  },
  "6.2.2": {
    context: "Le microservice de paiement hébergé à https://api.internal/flag est fortement protégé. Il nécessite du Mutual TLS (mTLS) pour les requêtes entrantes.",
    objective: "Localiser un certificat client et une clé valide laissés sur l'hôte, et les utiliser pour effectuer une requête réussie vers l'API.",
    concepts: ["mTLS", "Authentication", "Certificates", "Zero Trust"],
    steps: [
      {
        title: "Recherche des certificats",
        detail: "Vérifiez les fichiers de certificats disponibles sur le système.",
        command: "ls -la /etc/microservices/certs/"
      },
      {
        title: "Test de la connexion et obtention du flag",
        detail: "Faites une requête cURL avec la clé et le certificat. Le flag attendu est **PCE{mTLS_auth_successful_2024}**.",
        command: "curl --cert /etc/microservices/certs/client.crt --key /etc/microservices/certs/client.key https://api.internal/flag"
      }
    ]
  },
  "6.2.3": {
    context: "Une SCP empêche la création de ressources, mais une faille dans la logique de la politique permet de contourner cette restriction (bypass de région).",
    objective: "Identifier la faille dans la SCP et l'exploiter pour démarrer une instance EC2 dans la région autorisée.",
    concepts: ["AWS Organizations", "Service Control Policies (SCP)", "Policy Evaluation Logic", "Bypass"],
    steps: [
      {
        title: "Inspection de la SCP",
        detail: "Récupérez le document de la SCP attachée au compte pour l'analyser.",
        command: "aws organizations list-policies --filter SERVICE_CONTROL_POLICY"
      },
      {
        title: "Identification du bypass",
        detail: "Lisez la SCP. Vous remarquerez que la région 'eu-central-1' est autorisée.",
        command: "aws organizations describe-policy --policy-id p-12345"
      },
      {
        title: "Exploitation du bypass et obtention du flag",
        detail: "Lancez une instance EC2 dans la région autorisée pour obtenir le flag. Le flag attendu est **PCE{scp_region_bypass_2024}**.",
        command: "aws ec2 run-instances --region eu-central-1"
      }
    ]
  },
  "6.3.1": {
    context: "Lors d'un audit basé sur le CIS AWS Foundations Benchmark, un bucket S3 permet un accès public en lecture.",
    objective: "Activer la fonctionnalité S3 Block Public Access au niveau du compte pour corriger la non-conformité.",
    concepts: ["CIS Benchmark", "Security Audit", "Amazon S3", "Block Public Access"],
    steps: [
      {
        title: "Lancer l'audit initial",
        detail: "Vérifiez l'état de la configuration et identifiez le FAIL critique (CIS 2.1.5).",
        command: "python3 cis-audit.py"
      },
      {
        title: "Correction de la configuration",
        detail: "Modifiez le fichier account-config.json pour activer le blocage d'accès public au niveau du compte.",
        command: "sed -i 's/\"accountLevel\": false/\"accountLevel\": true/' account-config.json"
      },
      {
        title: "Validation et obtention du flag",
        detail: "Le score de conformité CIS sera de 100%. Le flag attendu est **PCE{cis_public_s3_block_2024}**.",
        command: "python3 cis-audit.py"
      }
    ]
  },
  "6.3.2": {
    context: "AWS Security Hub a remonté une alerte de sévérité CRITIQUE.",
    objective: "Consulter les 'findings' dans Security Hub et identifier la ressource vulnérable contenant le flag.",
    concepts: ["AWS Security Hub", "Security Posture Management", "Incident Response"],
    steps: [
      {
        title: "Liste des alertes",
        detail: "Utilisez la CLI mock pour récupérer les findings et trouvez le flag dans la description du finding CRITICAL. Le flag attendu est **PCE{cloud_security_hub_2026}**.",
        command: "aws securityhub get-findings"
      }
    ]
  },
  "6.3.3": {
    context: "Un attaquant a altéré la configuration d'audit du compte cloud. CloudTrail a capturé l'événement de désactivation, contenant le flag.",
    objective: "Investiguer les événements de sécurité hors-ligne pour découvrir le flag.",
    concepts: ["AWS CloudTrail", "AWS Config", "Audit Logging", "Forensics"],
    steps: [
      {
        title: "Recherche de l'événement de compromission",
        detail: "Consultez le fichier de logs CloudTrail pour trouver l'appel API 'StopLogging' et identifier le nom du trail contenant le flag. Le flag attendu est **PCE{cloudtrail_config_bypassed_2026}**.",
        command: "cat lab-data/cloudtrail_logs.json"
      }
    ]
  }
};
