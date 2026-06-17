import type { ChallengeGuide } from "../guides";

export const guides: Record<string, ChallengeGuide> = {
  "6.1.1": {
    context: "Le VPC de l'environnement de production a été mal conçu : les instances privées (comme les bases de données) sont placées dans des sous-réseaux qui possèdent une route directe vers Internet via une Internet Gateway (IGW), ce qui les expose à des attaques externes.",
    objective: "Corriger la table de routage des sous-réseaux privés pour utiliser une NAT Gateway au lieu de l'Internet Gateway, assurant ainsi la segmentation correcte du VPC.",
    concepts: ["AWS VPC", "Subnets", "Route Tables", "NAT Gateway", "Internet Gateway (IGW)", "Network Segmentation"],
    steps: [
      {
        title: "Inspection du VPC et des sous-réseaux",
        detail: "Tout d'abord, nous devons identifier l'ID du VPC et lister ses sous-réseaux pour repérer ceux qui sont incorrectement configurés.",
        command: "aws ec2 describe-vpcs\naws ec2 describe-subnets --filters \"Name=vpc-id,Values=<vpc-id>\""
      },
      {
        title: "Vérification des tables de routage",
        detail: "Examinez les tables de routage associées aux sous-réseaux privés. Vous verrez une route 0.0.0.0/0 pointant vers une ressource igw-xxx.",
        command: "aws ec2 describe-route-tables --filters \"Name=vpc-id,Values=<vpc-id>\""
      },
      {
        title: "Création/Identification de la NAT Gateway",
        detail: "Si une NAT Gateway n'existe pas, créez-en une dans le sous-réseau public. Sinon, récupérez son ID (nat-xxx).",
        command: "aws ec2 describe-nat-gateways"
      },
      {
        title: "Modification de la table de routage privée",
        detail: "Supprimez la route vers l'IGW et ajoutez une route vers la NAT Gateway pour le trafic sortant 0.0.0.0/0.",
        command: "aws ec2 replace-route --route-table-id <rtb-private-id> --destination-cidr-block 0.0.0.0/0 --nat-gateway-id <nat-id>"
      },
      {
        title: "Validation et obtention du flag",
        detail: "Une fois le routage corrigé, le script de validation vous confirmera la résolution. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.1.2": {
    context: "Les Security Groups d'une application sont configurés avec des règles trop permissives. Des ports d'administration critiques (comme le port 22 pour SSH ou 3389 pour RDP) sont ouverts au monde entier (0.0.0.0/0).",
    objective: "Appliquer le principe de moindre privilège aux Security Groups en restreignant l'accès aux adresses IP nécessaires uniquement.",
    concepts: ["AWS Security Groups", "Least Privilege", "Ingress Rules", "Network Exposure"],
    steps: [
      {
        title: "Identification des Security Groups vulnérables",
        detail: "Listez les Security Groups et repérez ceux contenant des règles autorisant 0.0.0.0/0 sur des ports sensibles.",
        command: "aws ec2 describe-security-groups --query \"SecurityGroups[*].[GroupId,GroupName,IpPermissions]\""
      },
      {
        title: "Révocation de la règle permissive",
        detail: "Supprimez la règle Ingress qui expose le port 22 à tout Internet.",
        command: "aws ec2 revoke-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr 0.0.0.0/0"
      },
      {
        title: "Ajout d'une règle stricte",
        detail: "Autorisez uniquement l'IP de votre Bastion ou votre propre IP pour l'administration.",
        command: "aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr <votre-ip>/32"
      },
      {
        title: "Validation et obtention du flag",
        detail: "Après avoir restreint l'accès, le moteur de lab détecte la fermeture de la faille. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.1.3": {
    context: "Pour accéder à des serveurs internes de manière sécurisée sans les exposer publiquement, un Bastion host (ou serveur de rebond) couplé à une connexion VPN doit être utilisé.",
    objective: "Configurer un tunnel SSH sécurisé (ProxyJump) via un Bastion pour atteindre une instance interne.",
    concepts: ["Bastion Host", "VPN", "SSH ProxyJump", "Network Access Control"],
    steps: [
      {
        title: "Récupération des informations de connexion",
        detail: "Trouvez l'IP publique du Bastion et l'IP privée de l'instance cible.",
        command: "aws ec2 describe-instances --query \"Reservations[*].Instances[*].[Tags[?Key=='Name'].Value,PublicIpAddress,PrivateIpAddress]\""
      },
      {
        title: "Connexion via ProxyJump",
        detail: "Utilisez l'option -J de SSH pour rebondir automatiquement sur le Bastion et vous connecter à l'instance interne.",
        command: "ssh -i key.pem -J ec2-user@<ip-bastion> ec2-user@<ip-interne>"
      },
      {
        title: "Lecture du flag",
        detail: "Une fois connecté sur l'instance interne, lisez le fichier contenant le flag.",
        command: "cat /var/www/html/flag.txt"
      },
      {
        title: "Soumission du flag",
        detail: "Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.1.4": {
    context: "Une application web hébergée sur un Application Load Balancer (ALB) subit des attaques courantes du Top 10 OWASP, telles que des injections SQL (SQLi) et du Cross-Site Scripting (XSS).",
    objective: "Concevoir et attacher un Web Application Firewall (WAF) avec des règles spécifiques pour bloquer ces attaques.",
    concepts: ["AWS WAF", "OWASP Top 10", "SQL Injection", "XSS", "Application Security"],
    steps: [
      {
        title: "Création d'un WebACL",
        detail: "Créez un AWS WAFv2 WebACL avec une règle par défaut pour autoriser le trafic (Allow).",
        command: "aws wafv2 create-web-acl --name AppProtection --scope REGIONAL --default-action Allow={} --visibility-config MetricName=AppProtection,CloudWatchMetricsEnabled=true,SampledRequestsEnabled=true"
      },
      {
        title: "Ajout des règles gérées (Managed Rules)",
        detail: "Mettez à jour le WebACL pour inclure la règle 'AWSManagedRulesSQLiRuleSet' afin de bloquer automatiquement les requêtes contenant des payloads SQLi.",
        command: "aws wafv2 update-web-acl --name AppProtection --scope REGIONAL --id <webacl-id> --lock-token <token> --rules <json-rules-file>"
      },
      {
        title: "Association à l'ALB",
        detail: "Associez le WebACL fraîchement configuré à l'ARN de votre Application Load Balancer.",
        command: "aws wafv2 associate-web-acl --web-acl-arn <webacl-arn> --resource-arn <alb-arn>"
      },
      {
        title: "Vérification et obtention du flag",
        detail: "Tentez une injection SQL (ex: ?id=1' OR '1'='1). Si la requête est bloquée (403 Forbidden), le défi est réussi. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.2.1": {
    context: "Une stratégie IAM (Policy) est actuellement rattachée à un rôle très utilisé. Problème : elle contient un bloc accordant les droits 'Action: *' sur 'Resource: *', violant gravement le principe du moindre privilège.",
    objective: "Restreindre la politique IAM pour qu'elle ne permette que les actions strictement requises (ex: accès en lecture seule à un bucket S3 précis).",
    concepts: ["AWS IAM", "Zero Trust", "Principle of Least Privilege (PoLP)", "Policy Simulation"],
    steps: [
      {
        title: "Analyse de la politique existante",
        detail: "Affichez la politique IAM associée pour identifier le statement trop permissif.",
        command: "aws iam get-policy-version --policy-arn <policy-arn> --version-id v1"
      },
      {
        title: "Création d'une politique restreinte",
        detail: "Créez un fichier policy.json autorisant uniquement, par exemple, s3:GetObject sur le bucket désiré.",
        command: "echo '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::mon-bucket/*\"}]}' > policy.json"
      },
      {
        title: "Mise à jour de la politique IAM",
        detail: "Créez une nouvelle version de la politique et définissez-la comme version par défaut.",
        command: "aws iam create-policy-version --policy-arn <policy-arn> --policy-document file://policy.json --set-as-default"
      },
      {
        title: "Validation et obtention du flag",
        detail: "Le script de conformité vérifiera l'absence du '*:*'. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.2.2": {
    context: "Dans un cluster Kubernetes avec Istio, les communications entre les microservices 'frontend' et 'backend' se font en clair. Un attaquant dans le cluster pourrait intercepter ou modifier ces flux.",
    objective: "Mettre en place une authentification mutuelle TLS (mTLS) stricte pour chiffrer le trafic interne.",
    concepts: ["mTLS", "Istio", "Service Mesh", "Zero Trust", "Kubernetes"],
    steps: [
      {
        title: "Vérification de l'état actuel",
        detail: "Vérifiez que le mode mTLS n'est pas appliqué strictement.",
        command: "kubectl get peerauthentication --all-namespaces"
      },
      {
        title: "Création de la politique PeerAuthentication",
        detail: "Rédigez un manifeste YAML pour forcer le mTLS strict sur le namespace de l'application.",
        command: "echo 'apiVersion: security.istio.io/v1beta1\nkind: PeerAuthentication\nmetadata:\n  name: default\n  namespace: mon-app\nspec:\n  mtls:\n    mode: STRICT' > mtls-strict.yaml"
      },
      {
        title: "Application de la politique",
        detail: "Appliquez la politique sur le cluster.",
        command: "kubectl apply -f mtls-strict.yaml"
      },
      {
        title: "Test de la connexion et obtention du flag",
        detail: "Une tentative de connexion sans certificat client échouera désormais. Le vérificateur de lab vous octroiera le succès. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.2.3": {
    context: "Des Service Control Policies (SCP) sont en place pour interdire la création de ressources en dehors de la région eu-west-1. Toutefois, une faille dans la logique de la politique permet de contourner cette restriction.",
    objective: "Identifier la faille dans la SCP (bypass), exploiter ce comportement pour créer une ressource dans une autre région et comprendre comment corriger la politique.",
    concepts: ["AWS Organizations", "Service Control Policies (SCP)", "Policy Evaluation Logic", "Bypass"],
    steps: [
      {
        title: "Inspection de la SCP",
        detail: "Récupérez le document de la SCP attachée au compte pour l'analyser.",
        command: "aws organizations list-policies --filter SERVICE_CONTROL_POLICY"
      },
      {
        title: "Identification du bypass",
        detail: "Vous remarquerez peut-être qu'une condition ne s'applique pas à un certain rôle (ex: ArnNotEquals) ou qu'elle exclut certains services globaux mal configurés.",
        command: "aws organizations describe-policy --policy-id <policy-id>"
      },
      {
        title: "Exploitation du bypass",
        detail: "Assumez le rôle exempté ou utilisez l'action non couverte pour créer un bucket S3 dans us-east-1, prouvant ainsi la vulnérabilité.",
        command: "aws s3api create-bucket --bucket test-bypass-bucket --region us-east-1"
      },
      {
        title: "Obtention du flag",
        detail: "L'outil de vérification validera votre preuve d'exploitation de la SCP. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.3.1": {
    context: "Lors d'un audit basé sur le CIS AWS Foundations Benchmark, le contrôle 1.20 a échoué : un bucket S3 contenant des données sensibles permet un accès public en lecture.",
    objective: "Identifier ce bucket et activer la fonctionnalité S3 Block Public Access pour corriger la non-conformité.",
    concepts: ["CIS Benchmark", "Security Audit", "Amazon S3", "Block Public Access"],
    steps: [
      {
        title: "Recherche du bucket public",
        detail: "Vérifiez les paramètres de blocage d'accès public des buckets S3 de votre compte pour trouver celui qui est vulnérable.",
        command: "aws s3api get-public-access-block --bucket <bucket-name> || echo 'Pas de blocage'"
      },
      {
        title: "Activation de Block Public Access",
        detail: "Appliquez la configuration stricte pour bloquer les ACLs et les politiques de bucket publiques.",
        command: "aws s3api put-public-access-block --bucket <bucket-name> --public-access-block-configuration \"BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true\""
      },
      {
        title: "Vérification",
        detail: "Assurez-vous que la configuration est bien prise en compte, résolvant ainsi la violation du benchmark CIS.",
        command: "aws s3api get-public-access-block --bucket <bucket-name>"
      },
      {
        title: "Validation",
        detail: "Le score de conformité CIS augmentera. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.3.2": {
    context: "AWS Security Hub a remonté une alerte de sévérité CRITIQUE concernant une mauvaise configuration de sécurité majeure (ex: une clé d'accès IAM racine utilisée récemment ou une base de données publique).",
    objective: "Consulter les 'findings' dans Security Hub, identifier la ressource vulnérable et appliquer la remédiation appropriée.",
    concepts: ["AWS Security Hub", "Security Posture Management", "Incident Response", "Remediation"],
    steps: [
      {
        title: "Liste des alertes critiques",
        detail: "Utilisez la CLI pour filtrer les 'findings' de Security Hub ayant une sévérité CRITICAL et un statut ACTIVE.",
        command: "aws securityhub get-findings --filters '{\"SeverityLabel\":[{\"Value\":\"CRITICAL\",\"Comparison\":\"EQUALS\"}],\"RecordState\":[{\"Value\":\"ACTIVE\",\"Comparison\":\"EQUALS\"}]}'"
      },
      {
        title: "Analyse du finding",
        detail: "Identifiez la ressource incriminée (par exemple, une access key IAM spécifique). Lisez la description de la vulnérabilité.",
        command: "Examinez le JSON retourné par la commande précédente pour extraire le ResourceId."
      },
      {
        title: "Remédiation manuelle",
        detail: "Appliquez la correction demandée, comme désactiver une clé d'accès ou chiffrer un volume.",
        command: "aws iam update-access-key --access-key-id <ACCESS_KEY> --status Inactive"
      },
      {
        title: "Obtention du flag",
        detail: "Après correction, le statut du finding passera à RESOLVED. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  "6.3.3": {
    context: "Pour brouiller les pistes, un attaquant a altéré la configuration d'audit du compte cloud : CloudTrail a été interrompu ou AWS Config a été désactivé.",
    objective: "Investiguer les événements de sécurité pour découvrir comment la journalisation a été compromise, puis réactiver correctement CloudTrail et Config.",
    concepts: ["AWS CloudTrail", "AWS Config", "Audit Logging", "Evasion Techniques", "Forensics"],
    steps: [
      {
        title: "Vérification du statut de CloudTrail",
        detail: "Listez les trails existants et vérifiez leur statut pour constater que le logging est en pause.",
        command: "aws cloudtrail describe-trails\naws cloudtrail get-trail-status --name <trail-name>"
      },
      {
        title: "Recherche de l'événement de compromission",
        detail: "Consultez les événements CloudTrail récents pour trouver l'appel API 'StopLogging' et identifier l'IP/l'utilisateur responsable.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=StopLogging"
      },
      {
        title: "Réactivation de CloudTrail",
        detail: "Relancez la journalisation pour restaurer la conformité et la visibilité de l'audit.",
        command: "aws cloudtrail start-logging --name <trail-name>"
      },
      {
        title: "Validation et obtention du flag",
        detail: "Le lab valide que les mécanismes de traçabilité sont à nouveau opérationnels. Le flag attendu est **PCE{...}**."
      }
    ]
  }
};
