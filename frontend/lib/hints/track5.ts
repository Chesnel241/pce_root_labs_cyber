/** Indices détaillés (3 par challenge) — Track 5. */
export const hints: Record<string, string[]> = {
  "5.1.2": [
    "Une alerte de trafic sortant anormal vient de tomber : les VPC Flow Logs sont ta meilleure source pour confirmer une exfiltration. Concentre-toi sur le groupe de logs /aws/vpc/flowlogs et cherche le trafic qui sort du VPC.",
    "Filtre d'abord les connexions rejetées avec le pattern REJECT, puis observe les adresses IP de destination et les ports. Un port comme 53 (DNS) ou un volume de transfert élevé vers une IP externe inconnue doit attirer ton attention.",
    "Lance : aws logs filter-log-events --log-group-name /aws/vpc/flowlogs --filter-pattern \"REJECT\". Repère l'IP de destination suspecte et le port associé ; c'est ce couple IP + canal d'exfiltration qui constitue la base du flag.",
  ],
  "5.1.3": [
    "Une modification de politiques IAM a été signalée : c'est typiquement une escalade de privilèges. CloudTrail garde la trace de toutes les actions IAM, c'est là qu'il faut chercher les événements sensibles d'attachement de politique.",
    "Cible les actions comme AttachUserPolicy ou PutUserPolicy dans CloudTrail. Une fois l'événement repéré, identifie quel utilisateur a reçu la politique et de quelle politique il s'agit (souvent des droits Administrateur).",
    "Lance : aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AttachUserPolicy, puis vérifie les permissions avec aws iam list-attached-user-policies --user-name <utilisateur_suspect>. L'attachement d'une politique Admin confirme l'escalade.",
  ],
  "5.1.4": [
    "Un attaquant qui veut couvrir ses traces commence souvent par couper la journalisation. Demande-toi quel événement CloudTrail traduit l'arrêt de l'enregistrement des appels API AWS, puis cherche-le dans les logs.",
    "L'événement clé est StopLogging (l'attaquant peut aussi aller jusqu'à DeleteTrail). Une fois trouvé, extrais l'identité IAM et l'adresse IP source qui ont déclenché cette désactivation.",
    "Lance : aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=StopLogging (et compare avec AttributeValue=DeleteTrail). L'événement de désactivation des logs te donne la confirmation de l'évasion ; pas besoin d'aller plus loin que cet événement.",
  ],
  "5.2.2": [
    "L'attaquant cherche à garder un accès durable : pense persistance. Une fonction Lambda dont la politique d'accès a été ouverte à un compte externe est un grand classique de backdoor. Commence par lister les fonctions Lambda.",
    "Pour chaque fonction suspecte, inspecte sa politique basée sur la ressource (resource-based policy). Tu cherches une autorisation AddPermission accordée à un Principal externe ou inconnu, qui permet à quelqu'un d'autre d'invoquer la fonction.",
    "Liste avec aws lambda list-functions, puis examine aws lambda get-policy --function-name <nom_lambda_suspecte>. Un Principal correspondant à un compte AWS étranger dans la policy confirme la backdoor de persistance.",
  ],
  "5.2.3": [
    "Une instance EC2 qui consomme du CPU en continu, c'est la signature d'un cryptominer. Appuie-toi sur les métriques CloudWatch (CPUUtilization) pour repérer l'instance dont l'usage processeur reste collé à 100%.",
    "Une fois l'instance identifiée, regarde son trafic réseau dans les VPC Flow Logs : un mineur se connecte à un pool de minage, souvent sur des ports caractéristiques comme 3333. Croise pic CPU constant + connexion vers un pool.",
    "Récupère les stats avec aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization --dimensions Name=InstanceId,Value=<id_instance> --statistics Maximum, puis confirme via les Flow Logs la connexion au pool de minage. La détection du mineur valide le challenge.",
  ],
  "5.2.4": [
    "Le trafic anormal pointe vers une exfiltration via DNS (DNS tunneling). Les logs de requêtes DNS de Route53 (ou VPC DNS Query Logs) sont la bonne source : cherche dans le groupe /aws/route53/querylogs.",
    "Le signe distinctif du tunneling, ce sont des requêtes DNS anormalement longues, avec des sous-domaines aléatoires répétés sous un même domaine de base. Filtre les événements QUERY et repère ce domaine racine.",
    "Lance : aws logs filter-log-events --log-group-name /aws/route53/querylogs --filter-pattern \"QUERY\". Identifie le domaine de base réutilisé dans des requêtes anormalement longues ; cette anomalie confirme l'exfiltration DNS.",
  ],
  "5.3.1": [
    "Tu es en réponse à incident : l'objectif est le containment, isoler vite l'instance EC2 compromise pour stopper la propagation. Commence par retrouver l'ID de l'instance visée par l'alerte.",
    "L'isolation se fait au niveau réseau en changeant le Security Group : on assigne à l'instance un SG de quarantaine (vide) qui bloque tout trafic entrant et sortant, sans éteindre l'instance pour préserver les preuves.",
    "Trouve l'instance avec aws ec2 describe-instances --filters \"Name=tag:Name,Values=CompromisedInstance\", puis isole-la via aws ec2 modify-instance-attribute --instance-id <id_instance_compromise> --groups <id_sg_quarantaine>. L'instance isolée valide l'objectif.",
  ],
  "5.3.3": [
    "Scénario ransomware cloud : les données ont été chiffrées en masse. Le chiffrement passe par KMS, donc cherche dans CloudTrail des appels d'API KMS inhabituellement nombreux, signe d'un chiffrement automatisé à grande échelle.",
    "Cible les événements GenerateDataKey (ou Encrypt) générés en rafale. Ensuite, ouvre le détail d'un événement pour en extraire deux éléments : l'Access Key ID de l'attaquant (commence par AKIA...) et son adresse IP source.",
    "Lance : aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=GenerateDataKey, et examine aussi les PutObject. Récupère l'IP d'origine et l'Access Key ID (AKIA...) dans les détails de l'événement ; ce couple IP + clé constitue la solution.",
  ],
  "5.4.1": [
    "Ici tu fais du detection engineering : il s'agit de mettre en place (ou vérifier) des règles de détection des actions IAM dangereuses. EventBridge est le service à inspecter pour les règles qui surveillent les événements IAM critiques.",
    "Liste les règles EventBridge et repère celles qui ciblent des événements comme CreateUser ou AttachUserPolicy. Vérifie ensuite leurs cibles (targets) pour comprendre comment l'alerte est transmise, par exemple vers un topic SNS.",
    "Lance : aws events list-rules, puis aws events list-targets-by-rule --rule <nom_regle_detection_iam>. La présence d'une règle IAM correctement routée vers une cible d'alerte (SNS) valide la mise en place de la détection.",
  ],
  "5.4.3": [
    "L'objectif est l'alerting sur des appels d'API suspects. Côté AWS, ce mécanisme repose sur les alarmes CloudWatch déclenchées par des métriques issues des logs CloudTrail. Commence par recenser les alarmes existantes.",
    "Liste les alarmes avec aws cloudwatch describe-alarms, puis remonte au filtre métrique (Metric Filter) associé pour voir exactement quel pattern d'API déclenche l'alerte. C'est ce filtre qui définit l'API surveillée.",
    "Inspecte le filtre via aws logs describe-metric-filters --log-group-name CloudTrail/DefaultLogGroup. Le filterPattern te révèle l'appel d'API sensible surveillé et l'alarme associée confirme la configuration de l'alerte.",
  ],
};
