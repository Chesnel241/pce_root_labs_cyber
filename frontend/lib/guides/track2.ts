import { ChallengeGuide } from "../guides";

export const guides: Record<string, ChallengeGuide> = {
  "2.1.1": {
    context: "Il est crucial pour la sécurité de votre environnement AWS que tous les utilisateurs ayant un accès programmatique ou à la console aient l'authentification multifacteur (MFA) activée.",
    objective: "Détecter des utilisateurs IAM sans MFA activé.",
    concepts: ["AWS IAM", "MFA", "Security Audit"],
    steps: [
      {
        title: "Lister les utilisateurs du compte",
        detail: "La première étape consiste à demander à AWS la liste des utilisateurs du compte pour repérer les cibles potentielles.",
        command: "aws iam list-users"
      },
      {
        title: "Vérifier le statut MFA",
        detail: "Pour chaque utilisateur, vérifiez les périphériques MFA associés afin de trouver ceux qui n'en ont pas. Testons sur 'intern_charlie' :",
        command: "aws iam list-mfa-devices --user-name intern_charlie"
      },
      {
        title: "Isoler l'utilisateur compromis",
        detail: "En analysant le résultat, vous remarquez que 'intern_charlie' n'a pas de MFA activé. Obtenez ses informations détaillées (Tags) pour localiser le drapeau. Le flag attendu est **PCE{iam_no_mfa_found_2024}**.",
        command: "aws iam get-user --user-name intern_charlie"
      }
    ]
  },
  "2.1.2": {
    context: "Les clés d'accès IAM qui n'ont pas été utilisées depuis plus de 90 jours posent un risque de sécurité important si elles ont été oubliées par leurs propriétaires.",
    objective: "Identifier des access keys jamais utilisées (> 90 jours).",
    concepts: ["AWS IAM", "Access Keys", "Rotation"],
    steps: [
      {
        title: "Consulter l'audit des clés",
        detail: "Dans cet environnement, un fichier 'access_keys_audit.csv' a été généré. Affichez son contenu pour identifier les clés problématiques.",
        command: "cat access_keys_audit.csv"
      },
      {
        title: "Trouver la clé dormante",
        detail: "Recherchez la clé d'accès appartenant à 'eve' dont le statut est 'Active' mais qui n'a pas été utilisée depuis plus de 90 jours. L'ID de la clé est le flag. Le flag attendu est **PCE{AKIA5QYV7B8E9F0G1H2I}**."
      }
    ]
  },
  "2.1.3": {
    context: "L'attribution de permissions trop larges (`Action: *`) à des utilisateurs ou rôles peut mener à une compromission complète du compte AWS.",
    objective: "Trouver une politique avec wildcard dangereux (Action:*).",
    concepts: ["AWS IAM", "Privilege Escalation", "Wildcard Policies"],
    steps: [
      {
        title: "Lister les politiques attachées",
        detail: "Affichez la liste des politiques gérées localement sur le compte AWS pour trouver celles configurées manuellement.",
        command: "aws iam list-policies --scope Local"
      },
      {
        title: "Examiner le contenu d'une politique suspecte",
        detail: "Inspectez la politique 'PCE-Deploy-FullAccess' pour y trouver une permission avec l'action `*`.",
        command: "aws iam get-policy-version --policy-arn arn:aws:iam::123456789012:policy/PCE-Deploy-FullAccess --version-id v3"
      },
      {
        title: "Récupérer le flag",
        detail: "Une fois identifiée, utilisez l'outil d'audit sur l'ARN de cette politique pour extraire le drapeau. Le flag attendu est **PCE{iam_wildcard_admin_policy_2024}**.",
        command: "aws iam audit-policy --policy-arn arn:aws:iam::123456789012:policy/PCE-Deploy-FullAccess"
      }
    ]
  },
  "2.1.4": {
    context: "Des clés d'accès peuvent parfois être committées accidentellement dans un dépôt de code source (Git), permettant à un attaquant de s'introduire dans votre compte AWS.",
    objective: "Détecter des access keys exposées dans un repo Git.",
    concepts: ["Git", "Secrets Leak", "OSINT", "AWS IAM"],
    steps: [
      {
        title: "Naviguer dans le dépôt cible",
        detail: "Placez-vous dans le répertoire du projet Git local vulnérable.",
        command: "cd project"
      },
      {
        title: "Rechercher des secrets dans l'historique",
        detail: "Utilisez git log pour analyser l'historique complet des commits à la recherche d'identifiants de clés AWS (AKIA).",
        command: "git log -p | grep 'AKIA'"
      },
      {
        title: "Identifier la clé exposée",
        detail: "Les clés d'accès (Access Key ID et Secret Access Key) ont été trouvées dans un ancien commit. Exécutez le script python à la racine avec ces clés pour récupérer le drapeau. Le flag attendu est **PCE{git_keys_exposed_2024}**.",
        command: "../verify-keys.py"
      }
    ]
  },
  "2.2.1": {
    context: "La permission `iam:PassRole` combinée avec `ec2:RunInstances` permet à un attaquant de créer une instance EC2 et de lui attacher un rôle ayant des droits étendus (ex: Administrateur), puis de se connecter à cette instance pour utiliser ces droits.",
    objective: "PassRole exploitation (créer une EC2 avec rôle admin).",
    concepts: ["AWS IAM", "PassRole", "EC2", "Privilege Escalation"],
    steps: [
      {
        title: "Vérifier ses propres permissions",
        detail: "Identifiez les politiques en ligne associées à votre utilisateur actuel, `svc-ci-deployer`.",
        command: "aws iam get-user-policy --user-name svc-ci-deployer --policy-name ci-deploy-inline"
      },
      {
        title: "Comprendre la faille",
        detail: "La politique trouvée combine les droits pour lancer une instance EC2 (`ec2:RunInstances`) et pour passer n'importe quel rôle IAM (`iam:PassRole` avec ressource `*`)."
      },
      {
        title: "Auditer l'utilisateur et récupérer le flag",
        detail: "Exécutez la commande d'audit de l'environnement pour valider la découverte de cette faille et récupérer le drapeau. Le flag attendu est **PCE{passrole_runinstances_privesc_2024}**.",
        command: "aws iam audit-user --user-name svc-ci-deployer"
      }
    ]
  },
  "2.2.2": {
    context: "Si un utilisateur dispose des droits pour créer des clés d'accès (`iam:CreateAccessKey`) pour un autre utilisateur IAM ayant plus de privilèges, il peut les générer pour élever ses privilèges.",
    objective: "CreateAccessKey sur un autre utilisateur pour pivot.",
    concepts: ["AWS IAM", "Privilege Escalation", "CreateAccessKey"],
    steps: [
      {
        title: "Identifier un utilisateur avec plus de droits",
        detail: "Listez les utilisateurs IAM et repérez-en un avec un profil Administrateur (ici, `admin_user`).",
        command: "aws iam list-users"
      },
      {
        title: "Générer de nouvelles clés d'accès",
        detail: "Utilisez vos permissions pour créer une nouvelle clé d'accès pour l'utilisateur cible `admin_user`.",
        command: "aws iam create-access-key --user-name admin_user"
      },
      {
        title: "S'authentifier en tant que cible",
        detail: "En exécutant cette commande, la `SecretAccessKey` renvoyée contiendra le drapeau du challenge. Le flag attendu est **PCE{iam_pivot_key_2026}**."
      }
    ]
  },
  "2.2.3": {
    context: "L'autorisation `iam:UpdateAssumeRolePolicy` permet de modifier la relation d'approbation d'un rôle. Un attaquant peut ainsi autoriser son propre compte à assumer un rôle d'administration.",
    objective: "UpdateAssumeRolePolicy pour s'attribuer un rôle admin.",
    concepts: ["AWS IAM", "Trust Policy", "AssumeRole", "Privilege Escalation"],
    steps: [
      {
        title: "Préparer la nouvelle politique de confiance",
        detail: "Vous disposez d'un fichier `trust-policy.json` (ou vous devez le créer) stipulant que `dev-user` a le droit d'assumer le rôle."
      },
      {
        title: "Mettre à jour la politique du rôle",
        detail: "Appliquez la politique modifiée au rôle d'administration cible `admin-role` pour altérer ses approbations.",
        command: "aws iam update-assume-role-policy --role-name admin-role --policy-document file://trust-policy.json"
      },
      {
        title: "Assumer le rôle",
        detail: "Le rôle vous fait maintenant confiance. Assumez ce rôle pour obtenir un jeton valide. Ce jeton contiendra le drapeau recherché. Le flag attendu est **PCE{update_assume_role_policy_admin_2024}**.",
        command: "aws sts assume-role --role-arn arn:aws:iam::123456789012:role/admin-role --role-session-name PwnedSession"
      }
    ]
  },
  "2.3.1": {
    context: "L'authentification via OpenID Connect (OIDC) nécessite de vérifier précisément qui se connecte. Si la condition sur le champ `sub` est trop permissive (ex: wildcard `repo:*`), n'importe quel dépôt de cette organisation (ou de GitHub) peut obtenir l'accès AWS.",
    objective: "OIDC trust misconfiguration (GitHub Actions → accès AWS).",
    concepts: ["AWS IAM", "OIDC", "GitHub Actions", "Trust Policy"],
    steps: [
      {
        title: "Analyser la relation de confiance",
        detail: "Examinez la politique d'assomption OIDC du rôle IAM vulnérable `gha-deploy-prod`.",
        command: "aws iam get-role --role-name gha-deploy-prod"
      },
      {
        title: "Exploiter la configuration",
        detail: "Dans le document, vous remarquerez un `StringLike` sur `token.actions.githubusercontent.com:sub` défini à `repo:*` au lieu d'un dépôt spécifique."
      },
      {
        title: "Récupérer le flag",
        detail: "Auditez la relation de confiance (`trust-policy`) pour que le système vous valide et vous retourne le drapeau. Le flag attendu est **PCE{oidc_trust_wildcard_sub_2024}**.",
        command: "aws iam audit-trust --role-name gha-deploy-prod"
      }
    ]
  },
  "2.3.2": {
    context: "Les rôles IAM inter-comptes permettent à des utilisateurs d'un autre compte de s'authentifier. Si le rôle ne vérifie pas l'`ExternalId`, il peut être sujet au problème de 'Confused Deputy'.",
    objective: "Cross-account role trust abuse (condition manquante).",
    concepts: ["AWS IAM", "Cross-Account", "Confused Deputy"],
    steps: [
      {
        title: "Assumer le rôle cross-account vulnérable",
        detail: "Depuis le compte attaquant, exploitez la politique de confiance laxiste du compte de la victime en assumant directement le rôle `VulnerableRole`.",
        command: "aws sts assume-role --role-arn arn:aws:iam::999988887777:role/VulnerableRole --role-session-name ConfusedDeputy"
      },
      {
        title: "Configurer l'accès",
        detail: "Configurez les variables d'environnement (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) avec les valeurs renvoyées."
      },
      {
        title: "Récupérer l'objectif",
        detail: "Une fois authentifié en tant que rôle vulnérable, listez les buckets S3 et téléchargez le fichier `flag.txt` qui s'y trouve. Le flag attendu est **PCE{cross_account_trust_abuse_2024}**.",
        command: "aws s3 ls"
      }
    ]
  },
  "2.3.3": {
    context: "Les assertions SAML sont utilisées pour transmettre des informations d'identité. Une vulnérabilité dans la validation des signatures XML de ces assertions peut permettre à un attaquant de forger une réponse SAML valide pour n'importe quel utilisateur.",
    objective: "SAML assertion manipulation pour escalade.",
    concepts: ["SAML", "XML Signature Wrapping", "Federation"],
    steps: [
      {
        title: "Intercepter l'assertion SAML",
        detail: "Le jeton SAML intercepté se trouve dans le fichier `token.txt`. Décodez-le de base64 pour observer le XML en clair."
      },
      {
        title: "Manipuler l'assertion",
        detail: "Modifiez l'attribut du rôle de `user` à `admin` dans l'assertion. Étant donné que le système omet de rejeter les assertions non signées (vulnerability `XML Signature Bypass`), supprimez entièrement la balise `<Signature>`."
      },
      {
        title: "Soumettre la réponse",
        detail: "Enregistrez le nouveau contenu encodé en base64 dans `modified_token.txt` et passez-le au script vulnérable `login.py`.",
        command: "python3 login.py $(cat modified_token.txt)"
      },
      {
        title: "Récupérer le flag",
        detail: "L'application vous accepte en tant qu'administrateur car la validation cryptographique a été esquivée. Le flag attendu est **PCE{saml_sig_bypass_2026}**."
      }
    ]
  }
};
