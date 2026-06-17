import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  '5.1.1': {
    context: "Vous faites partie de l'équipe SOC et un comportement suspect a été signalé. Vous devez inspecter CloudTrail pour repérer une intrusion.",
    objective: "Analyser des CloudTrail logs et détecter une intrusion (ex: AssumeRole non autorisé).",
    concepts: ["CloudTrail", "AWS CLI", "AssumeRole"],
    steps: [
      {
        title: "Interrogation des logs CloudTrail",
        detail: "Utilisez AWS CLI pour rechercher les événements liés à l'action AssumeRole. Cela permet de voir quels rôles ont été assumés récemment.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole --region us-east-1"
      },
      {
        title: "Analyse de l'événement suspect",
        detail: "Examinez les détails de l'événement suspect dans les logs CloudTrail. Cherchez l'adresse IP d'origine ou l'identité qui a effectué l'action sans autorisation. L'information trouvée vous permettra d'obtenir le flag.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole --max-results 10"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois l'intrusion confirmée, soumettez le flag trouvé dans la plateforme. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.1.2': {
    context: "Une alerte de trafic sortant anormal a été levée. Vous devez vérifier les VPC Flow Logs pour confirmer l'exfiltration de données.",
    objective: "Identifier une exfiltration via VPC Flow Logs.",
    concepts: ["VPC Flow Logs", "Network Analysis", "CloudWatch Logs"],
    steps: [
      {
        title: "Recherche dans les VPC Flow Logs",
        detail: "Interrogez le groupe de logs associé aux VPC Flow Logs pour identifier le trafic vers des adresses IP suspectes ou des volumes de transfert élevés.",
        command: "aws logs filter-log-events --log-group-name /aws/vpc/flowlogs --filter-pattern \"REJECT\""
      },
      {
        title: "Identification de l'adresse IP d'exfiltration",
        detail: "A partir des logs filtrés, repérez l'adresse IP de destination et le port (ex: 53 pour DNS) qui indiquent une exfiltration de données. L'adresse IP impliquée est généralement incluse dans le flag.",
        command: "aws logs tail /aws/vpc/flowlogs --follow"
      },
      {
        title: "Validation du Flag",
        detail: "Soumettez le flag correspondant à l'incident d'exfiltration identifié. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.1.3': {
    context: "Une modification suspecte des politiques IAM a été signalée par les outils de sécurité.",
    objective: "Détecter une escalade de privilèges IAM dans les logs CloudTrail.",
    concepts: ["IAM Privilege Escalation", "CloudTrail", "AWS CLI"],
    steps: [
      {
        title: "Recherche d'actions IAM sensibles",
        detail: "Utilisez CloudTrail pour identifier les actions d'attachement ou de modification de politiques IAM, comme `AttachUserPolicy` ou `PutUserPolicy`.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AttachUserPolicy"
      },
      {
        title: "Analyse de la politique attachée",
        detail: "Vérifiez quelle politique a été attachée et à quel utilisateur. Les attaquants utilisent souvent cela pour obtenir des permissions Administrateur.",
        command: "aws iam list-attached-user-policies --user-name <suspect_user>"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois l'escalade de privilèges confirmée, entrez le flag. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.1.4': {
    context: "Il semble qu'un attaquant ait tenté de couvrir ses traces en désactivant la journalisation dans AWS.",
    objective: "Repérer un CloudTrail désactivé (tentative d'effacement de traces).",
    concepts: ["CloudTrail Evasion", "Log Analysis", "AWS CLI"],
    steps: [
      {
        title: "Recherche de la désactivation de CloudTrail",
        detail: "Cherchez les événements `StopLogging` dans CloudTrail, indiquant qu'un acteur a interrompu l'enregistrement des API AWS.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=StopLogging"
      },
      {
        title: "Identification de l'auteur",
        detail: "Extrayez l'identité IAM et l'adresse IP associées à cet événement de désactivation pour comprendre l'étendue de la compromission.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteTrail"
      },
      {
        title: "Validation du Flag",
        detail: "Soumettez le flag découvert suite à cette investigation. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.2.1': {
    context: "Une compromission initiale a eu lieu. Vous devez maintenant suivre les déplacements latéraux de l'attaquant au sein de l'environnement Cloud.",
    objective: "Chasser un lateral movement dans un environnement cloud compromis.",
    concepts: ["Lateral Movement", "Role Chaining", "Threat Hunting"],
    steps: [
      {
        title: "Analyse de la chaîne d'assomption de rôles (Role Chaining)",
        detail: "Recherchez de multiples événements `AssumeRole` successifs pour tracer la progression de l'attaquant d'un rôle à un autre.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole --max-results 50"
      },
      {
        title: "Traçage de la session",
        detail: "Associez les identifiants de session ou les identités source pour cartographier le chemin d'accès pris par l'attaquant.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=GetCallerIdentity"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois le mouvement latéral identifié, validez le flag. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.2.2': {
    context: "L'équipe d'intervention soupçonne la présence d'une porte dérobée (backdoor) permettant à l'attaquant de maintenir son accès.",
    objective: "Identifier un mécanisme de persistance (backdoor Lambda).",
    concepts: ["Persistence", "AWS Lambda", "Resource-based Policies"],
    steps: [
      {
        title: "Recherche de permissions Lambda suspectes",
        detail: "Listez les fonctions Lambda et inspectez leurs politiques d'accès pour identifier des autorisations accordées à des comptes externes ou inconnus (`AddPermission`).",
        command: "aws lambda list-functions"
      },
      {
        title: "Inspection de la politique de la fonction",
        detail: "Vérifiez la politique basée sur la ressource de la fonction Lambda suspecte pour voir qui peut l'invoquer.",
        command: "aws lambda get-policy --function-name <suspicious_lambda_name>"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois la persistance confirmée, vous pouvez valider l'exercice. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.2.3': {
    context: "Une consommation inhabituelle de ressources CPU a été détectée sur certaines instances EC2.",
    objective: "Détecter un cryptominer caché sur une instance EC2.",
    concepts: ["Cryptomining", "EC2", "CloudWatch Metrics"],
    steps: [
      {
        title: "Identification des instances sur-utilisées",
        detail: "Utilisez CloudWatch pour repérer les instances EC2 avec un usage CPU constant à 100%, caractéristique typique du minage de cryptomonnaie.",
        command: "aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization --dimensions Name=InstanceId,Value=<instance_id> --start-time 2026-06-01T00:00:00Z --end-time 2026-06-15T00:00:00Z --period 3600 --statistics Maximum"
      },
      {
        title: "Analyse du trafic réseau de l'instance",
        detail: "Examinez les VPC Flow Logs pour l'instance suspecte afin de repérer les connexions vers des pools de minage connus (souvent sur des ports spécifiques comme 3333).",
        command: "aws ec2 describe-instances --filters \"Name=instance-state-name,Values=running\""
      },
      {
        title: "Validation du Flag",
        detail: "Soumettez le flag après avoir confirmé la présence du mineur. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.2.4': {
    context: "Du trafic réseau anormal pointe vers une possible exfiltration de données en utilisant le protocole DNS.",
    objective: "Identifier une exfiltration DNS (DNS tunneling).",
    concepts: ["DNS Tunneling", "Data Exfiltration", "Route53 Logs"],
    steps: [
      {
        title: "Inspection des requêtes DNS",
        detail: "Analysez les logs de requêtes DNS de Route53 (ou VPC DNS Query Logs) pour repérer de très longues requêtes avec des sous-domaines générés aléatoirement.",
        command: "aws logs filter-log-events --log-group-name /aws/route53/querylogs --filter-pattern \"QUERY\""
      },
      {
        title: "Identification du domaine malveillant",
        detail: "Identifiez le nom de domaine de base utilisé pour le tunneling. La longueur anormale des requêtes confirme l'exfiltration.",
        command: "aws logs tail /aws/route53/querylogs --follow"
      },
      {
        title: "Validation du Flag",
        detail: "Soumettez le flag relatif à l'exfiltration DNS. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.3.1': {
    context: "En tant que répondeur à incident, vous devez isoler rapidement une machine EC2 compromise pour empêcher la propagation de l'attaque.",
    objective: "Containment d'une instance EC2 compromise (isolation réseau).",
    concepts: ["Incident Response", "EC2 Containment", "Security Groups"],
    steps: [
      {
        title: "Identification de l'instance",
        detail: "Trouvez l'ID de l'instance EC2 concernée par l'alerte de sécurité.",
        command: "aws ec2 describe-instances --filters \"Name=tag:Name,Values=CompromisedInstance\""
      },
      {
        title: "Modification du Security Group",
        detail: "Isolez l'instance en lui assignant un Security Group vide (ou de quarantaine) qui bloque tout trafic entrant et sortant.",
        command: "aws ec2 modify-instance-attribute --instance-id <compromised_instance_id> --groups <quarantine_sg_id>"
      },
      {
        title: "Validation du Flag",
        detail: "L'instance étant isolée, vous avez complété l'objectif. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.3.2': {
    context: "Des données sensibles auraient fuité depuis un bucket S3. Il faut mener l'enquête pour comprendre qui y a accédé.",
    objective: "Forensics d'un bucket S3 : retrouver qui a exfiltré quoi.",
    concepts: ["S3 Forensics", "Data Breach", "Access Logs"],
    steps: [
      {
        title: "Recherche des événements d'accès aux objets S3",
        detail: "Utilisez CloudTrail pour repérer les événements `GetObject` ou inspectez les S3 Server Access Logs pour identifier l'identité et l'IP ayant accédé massivement aux fichiers.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=GetObject"
      },
      {
        title: "Identification des objets exfiltrés",
        detail: "Listez les fichiers qui ont été téléchargés et identifiez l'acteur responsable de l'exfiltration.",
        command: "aws s3api list-objects-v2 --bucket <target_bucket>"
      },
      {
        title: "Validation du Flag",
        detail: "Confirmez l'acteur et l'exfiltration avec le flag. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.3.3': {
    context: "Une attaque par ransomware a chiffré les données dans l'environnement cloud. Il faut retrouver l'IP attaquante et l'Access Key compromise.",
    objective: "Scénario ransomware cloud : identifier les fichiers chiffrés et la source.",
    concepts: ["Ransomware", "AWS KMS", "CloudTrail"],
    steps: [
      {
        title: "Recherche de chiffrement de masse",
        detail: "Dans CloudTrail, recherchez les appels d'API KMS de type `Encrypt` ou `GenerateDataKey` générés de manière inhabituelle et massive.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=GenerateDataKey"
      },
      {
        title: "Identification de l'Access Key et de l'IP",
        detail: "Examinez les détails de l'événement pour extraire l'Access Key ID (AKIA...) de l'attaquant ainsi que son adresse IP d'origine.",
        command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=PutObject"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois la clé et l'IP récupérées, vous pouvez soumettre la solution. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.4.1': {
    context: "Pour améliorer la posture de sécurité, vous devez mettre en place des règles de détection pour les actions IAM dangereuses.",
    objective: "Créer des règles de détection pour les attaques IAM.",
    concepts: ["Detection Engineering", "EventBridge", "IAM"],
    steps: [
      {
        title: "Consultation des règles EventBridge existantes",
        detail: "Listez les règles EventBridge pour identifier celles qui surveillent les événements IAM critiques (comme `CreateUser`, `AttachUserPolicy`, etc.).",
        command: "aws events list-rules"
      },
      {
        title: "Vérification des cibles",
        detail: "Inspectez les cibles de ces règles pour voir comment les alertes sont transmises (par exemple vers SNS).",
        command: "aws events list-targets-by-rule --rule <iam_detection_rule_name>"
      },
      {
        title: "Validation du Flag",
        detail: "La création ou la vérification des règles vous donne le flag de réussite. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.4.2': {
    context: "De multiples alertes GuardDuty sont remontées. Votre mission est de distinguer les vraies attaques des faux positifs.",
    objective: "Triage d'alertes GuardDuty : vrais positifs vs faux positifs.",
    concepts: ["GuardDuty", "Alert Triage", "SIEM"],
    steps: [
      {
        title: "Récupération des alertes GuardDuty",
        detail: "Affichez la liste des findings (découvertes) GuardDuty pour votre environnement.",
        command: "aws guardduty list-findings --detector-id <detector_id>"
      },
      {
        title: "Analyse des détails de l'alerte",
        detail: "Obtenez les détails spécifiques de l'alerte pour comprendre le contexte et la gravité, et pour déterminer s'il s'agit d'une activité légitime ou malveillante.",
        command: "aws guardduty get-findings --detector-id <detector_id> --finding-ids <finding_id>"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois le vrai positif qualifié, soumettez le flag. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  },
  '5.4.3': {
    context: "Il est nécessaire d'être alerté lorsque des API spécifiques et potentiellement dangereuses sont appelées dans l'environnement.",
    objective: "Configurer des alertes sur des appels API suspects.",
    concepts: ["API Monitoring", "CloudWatch Alarms", "Alerting"],
    steps: [
      {
        title: "Inspection des métriques CloudWatch",
        detail: "Vérifiez les alarmes CloudWatch configurées sur les métriques log pour repérer celles liées aux appels d'API sensibles.",
        command: "aws cloudwatch describe-alarms"
      },
      {
        title: "Vérification du filtre de logs",
        detail: "Consultez le filtre métrique (Metric Filter) dans CloudWatch Logs pour comprendre précisément quel pattern d'API déclenche l'alerte.",
        command: "aws logs describe-metric-filters --log-group-name CloudTrail/DefaultLogGroup"
      },
      {
        title: "Validation du Flag",
        detail: "L'alerte configurée vous révèle le flag de validation. Le flag attendu est **PCE{...}**.",
        command: ""
      }
    ]
  }
};
