const fs = require('fs');

const dataFile = 'frontend/lib/data/curriculum.json';
let curriculum = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

const scenarios = {
  "1.1.1": "**Contexte :** Une entreprise a configuré un serveur de stockage cloud (Bucket S3) sans y ajouter de barrières de sécurité.\n\n**Objectif :** Découvre ce stockage public et fouille à l'intérieur pour retrouver un fichier de configuration secret oublié.\n\n**Outils & Pistes :** Lance le lab. Dans le terminal fourni, utilise la commande `aws --no-sign-request --endpoint-url http://localhost:9000 s3 ls` pour lister le contenu du stockage sans avoir besoin de mot de passe.",
  
  "1.1.2": "**Contexte :** Un compte AWS possède des services mal sécurisés qui répondent aux requêtes anonymes.\n\n**Objectif :** Utilise des techniques de reconnaissance pour identifier les services exposés.\n\n**Outils & Pistes :** Sers-toi de l'outil en ligne de commande `aws-cli` avec l'argument `--no-sign-request` pour tester différents services (IAM, EC2, S3) et voir lesquels te renvoient des informations au lieu d'une erreur 'Access Denied'.",
  
  "1.1.3": "**Contexte :** Un développeur a créé une interface de programmation (API Gateway) mais a oublié d'activer l'authentification sur certaines routes.\n\n**Objectif :** Trouve le lien public de cette API et navigue dans les chemins non documentés pour extraire des informations confidentielles.\n\n**Outils & Pistes :** Utilise la commande `curl` ou ton navigateur web pour interroger l'URL de l'API. Essaie des chemins standards comme `/api/v1/users` ou `/api/v1/config`.",
  
  "1.1.4": "**Contexte :** Même sans toucher aux serveurs d'une cible, on peut trouver des informations publiquement enregistrées sur internet (Reconnaissance Passive).\n\n**Objectif :** Utilise des registres publics pour trouver l'adresse d'un serveur d'administration caché.\n\n**Outils & Pistes :** Cherche le nom de domaine de l'entreprise sur des moteurs comme `crt.sh` (Certificate Transparency) ou `shodan.io` pour découvrir des sous-domaines oubliés ou des adresses IP exposées.",
  
  "1.2.1": "**Contexte :** Un seau S3 (bucket) de l'équipe Marketing est public. A priori, il ne contient que des images vitrines... mais quelqu'un y a peut-être caché un dossier interne.\n\n**Objectif :** Aspire le contenu caché du bucket S3 et exfiltre le fichier contenant des données d'employés.\n\n**Outils & Pistes :** Une simple commande `ls` ne montre pas tout. Utilise `aws s3 ls s3://nom-du-bucket --recursive` pour voir toute l'arborescence, puis télécharge le fichier avec `aws s3 cp`.",
  
  "1.2.2": "**Contexte :** L'authentification de l'API Gateway semble solide, mais elle vérifie mal certains paramètres d'entête (Headers HTTP).\n\n**Objectif :** Contourne la sécurité de l'API en forgeant une requête qui te donnera un accès non autorisé.\n\n**Outils & Pistes :** Inspecte les entêtes HTTP avec un outil comme Burp Suite ou Postman. Que se passe-t-il si tu modifies ou supprimes l'entête `Authorization` ou si tu injectes un faux JWT ?",
  
  "1.2.3": "**Contexte :** Une base de données (RDS) contenant les informations des clients a été déployée avec un accès ouvert à tout internet (0.0.0.0/0).\n\n**Objectif :** Connecte-toi directement à cette base de données et extrait le flag contenu dans la table des administrateurs.\n\n**Outils & Pistes :** Utilise un client de base de données classique (comme `mysql` ou `psql` en ligne de commande) en spécifiant le point de terminaison (endpoint) public de la base AWS.",
  
  "1.2.4": "**Contexte :** Le pare-feu cloud (Security Group) d'un serveur d'administration a été configuré à la va-vite. Tous les ports sont ouverts au monde entier.\n\n**Objectif :** Scan le serveur cible, trouve le service d'administration vulnérable et exploite-le pour lire le flag.\n\n**Outils & Pistes :** Utilise l'outil `nmap` depuis ton terminal pour trouver quels ports sont ouverts sur l'adresse IP publique de la cible (`nmap -sV <ip_cible>`).",
  
  "1.3.1": "**Contexte :** Tu as obtenu les accès d'un utilisateur très restreint. Cependant, cet utilisateur a le droit de donner n'importe quel rôle (PassRole) aux serveurs qu'il lance (RunInstances).\n\n**Objectif :** Crée un serveur (EC2) avec des droits Administrateur complets, connecte-toi dessus, puis crée-toi une clé d'accès permanente (CreateAccessKey).\n\n**Outils & Pistes :** C'est une faille de type Escalade de Privilèges IAM. Lance une instance via l'aws-cli en lui attachant le profil `admin-profile`, et laisse l'instance générer une clé pour toi.",
  
  "1.3.2": "**Contexte :** Dans le Cloud AWS, les identités peuvent 'assumer' (prendre la forme de) d'autres rôles grâce à la fonction AssumeRole.\n\n**Objectif :** Trouve le nom d'un rôle d'administration auquel tu as le droit de t'attacher, et utilise-le pour pivoter.\n\n**Outils & Pistes :** Utilise la commande `aws sts assume-role --role-arn arn:aws:iam::... --role-session-name PivotSession`. Tu recevras des clés d'accès temporaires à utiliser en tant que variables d'environnement.",
  
  "1.3.3": "**Contexte :** Une fonction serverless (AWS Lambda) prend en entrée des données fournies par les utilisateurs, mais ne les nettoie pas correctement.\n\n**Objectif :** Injecte du code malveillant dans la fonction Lambda pour qu'elle te renvoie les variables d'environnement (qui contiennent les clés d'accès du rôle de la Lambda).\n\n**Outils & Pistes :** Essaie d'injecter des commandes shell classiques comme `; env` ou `$(env)` dans les paramètres JSON que tu envoies à la Lambda.",
  
  "1.3.4": "**Contexte :** Un développeur a donné la permission extrêmement dangereuse `iam:AttachUserPolicy` à un simple utilisateur de support.\n\n**Objectif :** Sers-toi de cette permission pour t'auto-attribuer la politique `AdministratorAccess`.\n\n**Outils & Pistes :** Si tu as cette permission, tu peux ordonner à AWS de te donner tous les droits ! Exécute la commande `aws iam attach-user-policy --user-name <ton-user> --policy-arn arn:aws:iam::aws:policy/AdministratorAccess`.",
  
  "1.4.1": "**Contexte :** Une application web récupère des images à partir d'URLs (fonction d'importation). Elle est vulnérable au Server-Side Request Forgery (SSRF).\n\n**Objectif :** Piège l'application pour qu'elle interroge le service de métadonnées interne d'Amazon (IMDSv1) à l'adresse 169.254.169.254 et te renvoie les clés du serveur.\n\n**Outils & Pistes :** Pousse l'application à visiter l'URL magique : `http://169.254.169.254/latest/meta-data/iam/security-credentials/`. Tu récupéreras ainsi les identifiants temporaires de l'instance !",
  
  "1.4.2": "**Contexte :** L'entreprise a mis à jour ses serveurs vers IMDSv2, qui protège contre les SSRF classiques car il demande un entête HTTP spécifique (Token).\n\n**Objectif :** Découvre un moyen d'injecter cet entête HTTP obligatoire dans la vulnérabilité SSRF pour contourner l'IMDSv2.\n\n**Outils & Pistes :** L'IMDSv2 nécessite un jeton via un entête PUT et GET. Cherche comment forger des requêtes SSRF complexes incluant des headers personnalisés (via CRLF injection ou outils proxy).",
  
  "1.4.3": "**Contexte :** La faille SSRF de l'application web ne te permet pas d'accéder au cloud, mais le serveur est connecté au réseau interne de l'entreprise.\n\n**Objectif :** Utilise la SSRF comme un 'scanner' de réseau interne pour trouver une base de données cachée et lire le flag.\n\n**Outils & Pistes :** Demande au serveur de scanner ses propres ports locaux (localhost) ou d'autres machines du réseau (10.0.0.x). Si la page met plus de temps à charger, tu as peut-être trouvé un service interne vivant !"
};

let updatedCount = 0;
curriculum.tracks.forEach(track => {
  if (track.id === 'cloud-pentesting') {
    track.modules.forEach(module => {
      module.challenges.forEach(challenge => {
        if (scenarios[challenge.id]) {
          challenge.description = scenarios[challenge.id];
          updatedCount++;
        }
      });
    });
  }
});

fs.writeFileSync(dataFile, JSON.stringify(curriculum, null, 2));
console.log(`Successfully updated ${updatedCount} challenges in Track 1!`);
