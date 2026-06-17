import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  '5.1.1': {
    context: "Vous faites partie de l'équipe SOC et un comportement suspect a été signalé. Vous devez inspecter CloudTrail pour repérer une intrusion.",
    objective: "Analyser des CloudTrail logs et détecter une intrusion (ex: AssumeRole non autorisé).",
    concepts: ["CloudTrail", "AWS CLI", "AssumeRole"],
    steps: [
      {
        title: "Recherche de l'acteur malveillant",
        detail: "Utilisez jq pour analyser les IP sources et les user-agents dans les événements afin de repérer l'adresse IP intruse.",
        command: "jq -r '.Records[] | \"\\(.sourceIPAddress) \\(.userAgent)\"' ~/cloudtrail-events.json"
      },
      {
        title: "Identification de l'événement pivot",
        detail: "Cherchez les actions AssumeRole réalisées par cette IP suspecte pour comprendre quel rôle a été usurpé.",
        command: "grep -n \"AssumeRole\" ~/cloudtrail-events.json"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois l'adresse IP intruse confirmée (203.0.113.66), utilisez la commande de validation. Le flag attendu est **PCE{cloudtrail_unauthorized_assumerole_2024}**.",
        command: "verify-finding 203.0.113.66"
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
        detail: "Interrogez le fichier VPC Flow Logs local pour identifier le trafic, notamment vers le port DNS (53) qui indique une exfiltration.",
        command: "grep \" 53 \" ~/vpc-flow-logs.txt"
      },
      {
        title: "Identification de l'adresse IP d'exfiltration",
        detail: "À partir des logs, repérez l'adresse IP de destination suspecte. L'adresse IP impliquée est généralement incluse dans le flag.",
        command: "cat ~/vpc-flow-logs.txt"
      },
      {
        title: "Validation du Flag",
        detail: "Soumettez le flag correspondant à l'incident d'exfiltration (format : PCE{<IP>_dns_exfil}). Le flag attendu est **PCE{198.51.100.42_dns_exfil}**.",
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
        detail: "Utilisez grep pour identifier les actions d'attachement ou de modification de politiques IAM, comme `PutUserPolicy`.",
        command: "grep \"PutUserPolicy\" ~/logs/cloudtrail.json"
      },
      {
        title: "Analyse de la politique attachée",
        detail: "Vérifiez quelle politique a été attachée à l'utilisateur suspect (dev-johndoe). La payload de la politique révèle le flag.",
        command: "jq '.Records[] | select(.eventName==\"PutUserPolicy\")' ~/logs/cloudtrail.json"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois l'escalade de privilèges confirmée dans la charge utile, entrez le flag. Le flag attendu est **PCE{cloudtrail_iam_privesc_detected_2024}**.",
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
        detail: "Cherchez les événements `StopLogging` dans les logs, indiquant qu'un acteur a interrompu l'enregistrement.",
        command: "grep -i \"StopLogging\" ~/cloudtrail_logs.json"
      },
      {
        title: "Identification de l'auteur",
        detail: "Utilisez jq pour extraire les détails de cet événement de désactivation. Le flag se trouve dans les requestParameters.",
        command: "jq '.Records[] | select(.eventName==\"StopLogging\")' ~/cloudtrail_logs.json"
      },
      {
        title: "Validation du Flag",
        detail: "Soumettez le flag découvert dans `requestParameters.name`. Le flag attendu est **PCE{n0_m0r3_l0gs_4_u}**.",
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
        detail: "Lister tous les événements `AssumeRole` pour voir les rôles cibles et comprendre le chemin de l'attaquant.",
        command: "jq -r '.Records[] | select(.eventName==\"AssumeRole\") | \"\\(.userIdentity.userName // .userIdentity.arn) -> \\(.requestParameters.roleArn)\"' ~/cloudtrail-events.json"
      },
      {
        title: "Traçage de la session",
        detail: "Identifiez le rôle final, le plus privilégié (db-admin), en suivant les accès successifs.",
        command: "grep \"db-admin\" ~/cloudtrail-events.json"
      },
      {
        title: "Validation du Flag",
        detail: "Utilisez le script de vérification avec le nom du rôle final identifié. Le flag attendu est **PCE{lateral_movement_role_chain_2024}**.",
        command: "verify-finding db-admin"
      }
    ]
  },
  '5.2.2': {
    context: "L'équipe d'intervention soupçonne la présence d'une porte dérobée (backdoor) permettant à l'attaquant de maintenir son accès.",
    objective: "Identifier un mécanisme de persistance (backdoor Lambda).",
    concepts: ["Persistence", "AWS Lambda", "Resource-based Policies"],
    steps: [
      {
        title: "Recherche de code malveillant",
        detail: "L'équipe a exporté le code des fonctions Lambda dans `~/lambdas/`. Cherchez des appels système suspects ou de l'exécution de commande (ex: `subprocess`).",
        command: "grep -r \"subprocess\" ~/lambdas/"
      },
      {
        title: "Inspection de la fonction suspecte",
        detail: "Affichez le contenu de la fonction compromise pour comprendre comment la porte dérobée a été implémentée et trouver le flag.",
        command: "cat ~/lambdas/CleanupTask-Dev/lambda_function.py"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois le code de la backdoor lu, récupérez le flag. Le flag attendu est **PCE{L4mbd4_B4ckd00r_P3rsist3nc3_2024}**.",
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
        title: "Analyse des processus en cours",
        detail: "Utilisez la commande top pour vérifier les processus consommant le plus de CPU. Le cryptomineur est souvent très gourmand.",
        command: "top -n 1"
      },
      {
        title: "Examen de la configuration du mineur",
        detail: "Une fois le binaire suspect localisé (ex: `xmrig` dans `/var/tmp/.crypto/`), lisez son fichier de configuration pour retrouver les identifiants du pool de minage.",
        command: "cat /var/tmp/.crypto/config.json"
      },
      {
        title: "Validation du Flag",
        detail: "Soumettez le flag caché dans l'identifiant utilisateur (user) du mineur. Le flag attendu est **PCE{crypt0_m1n3r_3c2_d3t3ct3d}**.",
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
        detail: "Analysez les requêtes DNS pour identifier celles qui sont particulièrement longues et contiennent des données encodées.",
        command: "cat ~/dns.log | grep -v \"NXDOMAIN\""
      },
      {
        title: "Identification des données exfiltrées",
        detail: "Reconstituez les données envoyées vers le domaine malveillant pour identifier la signature de l'exfiltration.",
        command: "cat ~/dns.log"
      },
      {
        title: "Validation du Flag",
        detail: "Soumettez le flag trouvé suite à l'analyse des requêtes. Le flag attendu est **PCE{dns_tunn3ling_d3t3ct3d}**.",
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
        detail: "Utilisez le CLI AWS mocké pour lister les instances EC2 et trouver l'ID de la machine compromise.",
        command: "aws ec2 describe-instances"
      },
      {
        title: "Identification du Security Group de quarantaine",
        detail: "Listez les Security Groups disponibles pour trouver celui prévu pour l'isolation (ex: `sg-isolated`).",
        command: "aws ec2 describe-security-groups"
      },
      {
        title: "Modification du Security Group",
        detail: "Remplacez les groupes de l'instance `i-badc0ffee` par le Security Group de quarantaine `sg-isolated`.",
        command: "aws ec2 modify-instance-attribute --instance-id i-badc0ffee --groups sg-isolated"
      },
      {
        title: "Validation du Flag",
        detail: "La commande renverra le flag une fois l'instance correctement isolée. Le flag attendu est **PCE{ec2_containment_2024}**.",
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
        title: "Recherche des téléchargements anormaux",
        detail: "Utilisez awk sur le log d'accès S3 pour lister les téléchargements (`GET.OBJECT`) en les triant par volume de données (champ 15).",
        command: "awk '$8 ~ /GET.OBJECT/ {print $15, $6, $9}' ~/s3-access.log | sort -rn"
      },
      {
        title: "Corrélation avec CloudTrail",
        detail: "Croisez vos trouvailles avec CloudTrail pour voir l'origine de l'acteur (ex: `svc-reporting`) qui a téléchargé les données en masse.",
        command: "jq -r '.Records[] | select(.eventName==\"GetObject\") | \"\\(.userIdentity.userName) \\(.awsRegion) \\(.sourceIPAddress) \\(.requestParameters.key)\"' ~/cloudtrail-events.json"
      },
      {
        title: "Validation du Flag",
        detail: "Utilisez le script de vérification avec le compte usurpé pour obtenir le flag. Le flag attendu est **PCE{s3_forensics_exfil_actor_2024}**.",
        command: "verify-finding svc-reporting"
      }
    ]
  },
  '5.3.3': {
    context: "Une attaque par ransomware a chiffré les données dans l'environnement cloud. Il faut retrouver l'IP attaquante et l'Access Key compromise.",
    objective: "Scénario ransomware cloud : identifier les fichiers chiffrés et la source.",
    concepts: ["Ransomware", "AWS KMS", "CloudTrail"],
    steps: [
      {
        title: "Recherche d'actions de chiffrement",
        detail: "Dans CloudTrail, recherchez les appels KMS comme `Encrypt` ou `GenerateDataKey` pour trouver les actions du ransomware.",
        command: "grep \"Encrypt\" ~/cloudtrail-events.json"
      },
      {
        title: "Identification de la source",
        detail: "En utilisant jq, filtrez pour trouver l'adresse IP d'origine et la clé d'accès (AKIA...) utilisée par le ransomware.",
        command: "jq '.Records[] | select(.eventName==\"Encrypt\")' ~/cloudtrail-events.json"
      },
      {
        title: "Validation du Flag",
        detail: "Reconstituez le flag sous la forme IP_ACCESSKEY. Le flag attendu est **PCE{203.0.113.42_AKIAIOSFODNN7EXAMPLE}**.",
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
        title: "Recherche d'activités IAM suspectes",
        detail: "Analysez le fichier CloudTrail fourni pour identifier quel utilisateur IAM malveillant a été créé.",
        command: "jq -r '.Records[] | select(.eventName==\"CreateUser\") | .requestParameters.userName' ~/lab-data/cloudtrail.json"
      },
      {
        title: "Validation de la détection",
        detail: "Soumettez le nom de l'utilisateur malveillant (`evil_backdoor_admin`) au script pour vérifier votre règle.",
        command: "./submit_finding.sh evil_backdoor_admin"
      },
      {
        title: "Validation du Flag",
        detail: "L'exécution du script de soumission réussie vous donnera le flag de réussite. Le flag attendu est **PCE{iam_detection_rules_2024}**.",
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
        title: "Récupération et priorisation des alertes",
        detail: "Utilisez jq pour afficher la liste des findings GuardDuty par Verdict et Description afin de filtrer le bruit (activités légitimes).",
        command: "jq -r '.Findings[] | \"[\\(.Verdict)] \\(.Type) — \\(.Description)\"' ~/guardduty-findings.json"
      },
      {
        title: "Analyse des vrais positifs",
        detail: "Recherchez le finding qui n'a pas de \"TriageNote\" bénigne et qui correspond à une réelle attaque (ex: ID `5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef`).",
        command: "jq -r '.Findings[] | \"\\(.Severity) \\(.Type) \\(.Id)\"' ~/guardduty-findings.json | sort -rn"
      },
      {
        title: "Validation du Flag",
        detail: "Une fois le vrai positif identifié par son ID, confirmez-le pour obtenir le flag. Le flag attendu est **PCE{guardduty_true_positive_2024}**.",
        command: "verify-finding 5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef"
      }
    ]
  },
  '5.4.3': {
    context: "Il est nécessaire d'être alerté lorsque des API spécifiques et potentiellement dangereuses sont appelées dans l'environnement.",
    objective: "Configurer des alertes sur des appels API suspects.",
    concepts: ["API Monitoring", "CloudWatch Alarms", "Alerting"],
    steps: [
      {
        title: "Inspection des journaux d'API",
        detail: "Recherchez dans les logs l'appel à une API critique comme `DeleteTrail`, indiquant qu'un attaquant a tenté de supprimer la journalisation.",
        command: "grep \"DeleteTrail\" ~/lab-data/api_logs.json"
      },
      {
        title: "Identification de l'eventID",
        detail: "Repérez l'identifiant `eventID` associé à cet appel malveillant (`evt-005`).",
        command: "grep -o '\"eventID\": \"[^\"]*\"' ~/lab-data/api_logs.json"
      },
      {
        title: "Validation du Flag",
        detail: "Exécutez le script d'investigation en lui passant l'eventID trouvé pour confirmer l'alerte. Le flag attendu est **PCE{Suspicious_API_Calls_Detected_2026}**.",
        command: "python3 ~/lab-data/investigate.py evt-005"
      }
    ]
  }
};
