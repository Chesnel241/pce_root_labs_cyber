/** Indices détaillés (3 par challenge) — Track 6. */
export const hints: Record<string, string[]> = {
  "6.1.1": [
    "Indice 1 : Un sous-réseau « privé » ne devrait jamais avoir de route directe vers Internet. Demande-toi qui décide vraiment du chemin que prend le trafic sortant d'un sous-réseau dans un VPC.",
    "Indice 2 : Inspecte les tables de routage du VPC avec `aws ec2 describe-route-tables --filters \"Name=vpc-id,Values=<vpc-id>\"`. Repère la table des sous-réseaux privés : sa route 0.0.0.0/0 pointe vers une Internet Gateway (igw-xxx) alors qu'elle devrait passer par une NAT Gateway.",
    "Indice 3 : Récupère l'ID de la NAT Gateway (`aws ec2 describe-nat-gateways`), puis remplace la route fautive : `aws ec2 replace-route --route-table-id <rtb-private-id> --destination-cidr-block 0.0.0.0/0 --nat-gateway-id <nat-id>`. Dès que les sous-réseaux privés ne pointent plus vers l'IGW, la validation détecte la segmentation correcte et le flag apparaît.",
  ],
  "6.1.3": [
    "Indice 1 : L'instance interne n'a pas d'IP publique : tu ne peux pas l'atteindre directement. Pense « serveur de rebond » : passe d'abord par le Bastion exposé, puis saute vers la cible privée.",
    "Indice 2 : Récupère l'IP publique du Bastion et l'IP privée de l'instance cible avec `aws ec2 describe-instances --query \"Reservations[*].Instances[*].[Tags[?Key=='Name'].Value,PublicIpAddress,PrivateIpAddress]\"`. SSH sait rebondir tout seul grâce à l'option ProxyJump (-J).",
    "Indice 3 : Connecte-toi en une commande via le Bastion : `ssh -i key.pem -J ec2-user@<ip-bastion> ec2-user@<ip-interne>`. Une fois sur l'instance interne, lis le fichier qui contient le flag : `cat /var/www/html/flag.txt`.",
  ],
  "6.1.4": [
    "Indice 1 : Ton application derrière l'ALB encaisse des attaques OWASP (SQLi, XSS). La bonne réponse n'est pas de modifier le code applicatif mais d'ajouter une couche de filtrage en amont : un pare-feu applicatif (WAF).",
    "Indice 2 : Crée un WebACL WAFv2 en scope REGIONAL avec une action par défaut Allow (`aws wafv2 create-web-acl ...`). Ce qui bloque réellement les payloads, ce sont les règles gérées AWS, en particulier « AWSManagedRulesSQLiRuleSet ».",
    "Indice 3 : Ajoute le groupe de règles géré au WebACL (`aws wafv2 update-web-acl --name AppProtection --scope REGIONAL --id <webacl-id> --lock-token <token> --rules <json-rules-file>`), puis associe-le à l'ALB : `aws wafv2 associate-web-acl --web-acl-arn <webacl-arn> --resource-arn <alb-arn>`. Une injection de test (ex: ?id=1' OR '1'='1) doit alors renvoyer un 403 Forbidden, ce qui valide le défi et déclenche le flag.",
  ],
  "6.2.2": [
    "Indice 1 : Entre tes microservices Istio, le trafic circule en clair : n'importe qui dans le cluster peut l'écouter. L'objectif Zero Trust est d'imposer que chaque service prouve son identité ET chiffre la connexion — autrement dit du TLS mutuel (mTLS).",
    "Indice 2 : Vérifie l'état actuel avec `kubectl get peerauthentication --all-namespaces` : le mTLS n'est pas en mode strict. Dans Istio, c'est la ressource PeerAuthentication qui force ce comportement au niveau d'un namespace.",
    "Indice 3 : Crée un manifeste PeerAuthentication avec `spec.mtls.mode: STRICT` ciblant le namespace de l'application, puis applique-le : `kubectl apply -f mtls-strict.yaml`. Dès que toute connexion sans certificat client est refusée, le vérificateur valide le mTLS et le flag est délivré.",
  ],
  "6.2.3": [
    "Indice 1 : La SCP est censée interdire toute création de ressource hors de eu-west-1, mais la logique de la politique comporte un trou. Cherche une exception qui « oublie » un cas : un rôle exempté ou un service global non couvert.",
    "Indice 2 : Récupère et lis le document de la SCP (`aws organizations list-policies --filter SERVICE_CONTROL_POLICY` puis `aws organizations describe-policy --policy-id <policy-id>`). Regarde de près les conditions du type ArnNotEquals : un principal exclu peut contourner la restriction de région.",
    "Indice 3 : Exploite la faille en utilisant l'action/le rôle non couvert pour créer une ressource hors zone, par exemple un bucket dans us-east-1 : `aws s3api create-bucket --bucket test-bypass-bucket --region us-east-1`. La création réussie prouve le bypass, l'outil de vérification valide ta preuve et le flag apparaît.",
  ],
  "6.3.2": [
    "Indice 1 : Security Hub a centralisé les alertes pour toi. Ne pars pas chasser au hasard : commence par lire les findings de sévérité CRITICAL encore ACTIVE pour savoir exactement quelle ressource corriger.",
    "Indice 2 : Filtre les alertes avec `aws securityhub get-findings --filters '{\"SeverityLabel\":[{\"Value\":\"CRITICAL\",\"Comparison\":\"EQUALS\"}],\"RecordState\":[{\"Value\":\"ACTIVE\",\"Comparison\":\"EQUALS\"}]}'`, puis extrais le ResourceId du JSON (souvent une clé d'accès IAM exposée ou utilisée récemment).",
    "Indice 3 : Applique la remédiation demandée sur la ressource incriminée, par exemple désactiver la clé d'accès fautive : `aws iam update-access-key --access-key-id <ACCESS_KEY> --status Inactive`. Une fois la faille corrigée, le finding passe au statut RESOLVED et le flag s'affiche.",
  ],
  "6.3.3": [
    "Indice 1 : Un attaquant a coupé la journalisation pour effacer ses traces. Avant de tout réparer, fais l'enquête : qui a éteint quoi ? La réponse est elle-même dans les logs d'audit récents.",
    "Indice 2 : Constate la panne avec `aws cloudtrail describe-trails` puis `aws cloudtrail get-trail-status --name <trail-name>` (le logging est en pause). Recherche ensuite l'événement coupable : `aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=StopLogging` pour identifier l'utilisateur/l'IP responsable.",
    "Indice 3 : Restaure la traçabilité en relançant la journalisation : `aws cloudtrail start-logging --name <trail-name>` (et réactive AWS Config si nécessaire). Dès que les mécanismes d'audit sont de nouveau opérationnels, le lab valide la remédiation et délivre le flag.",
  ],
};
