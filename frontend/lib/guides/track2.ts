import { ChallengeGuide } from "../guides";

export const guides: Record<string, ChallengeGuide> = {
  "2.1.1": {
    context: "Il est crucial pour la sécurité de votre environnement AWS que tous les utilisateurs ayant un accès programmatique ou à la console aient l'authentification multifacteur (MFA) activée.",
    objective: "Détecter des utilisateurs IAM sans MFA activé.",
    concepts: ["AWS IAM", "MFA", "Security Audit"],
    steps: [
      {
        title: "Générer un rapport de credentials IAM",
        detail: "La première étape consiste à demander à AWS de générer un rapport récapitulatif de l'état des identifiants (mot de passe, access keys, MFA) pour tous les utilisateurs du compte.",
        command: "aws iam generate-credential-report"
      },
      {
        title: "Récupérer et analyser le rapport",
        detail: "Une fois le rapport généré, nous le récupérons au format CSV. Nous chercherons la colonne `mfa_active` pour repérer les utilisateurs sans MFA.",
        command: "aws iam get-credential-report --query 'Content' --output text | base64 -d > report.csv"
      },
      {
        title: "Isoler l'utilisateur compromis",
        detail: "En analysant le rapport, vous remarquez qu'un utilisateur n'a pas MFA activé. C'est l'objectif de notre audit. Le flag attendu est **PCE{iam_no_mfa_found_2024}**."
      }
    ]
  },
  "2.1.2": {
    context: "Les clés d'accès IAM qui n'ont pas été utilisées depuis plus de 90 jours posent un risque de sécurité important si elles ont été oubliées par leurs propriétaires.",
    objective: "Identifier des access keys jamais utilisées (> 90 jours).",
    concepts: ["AWS IAM", "Access Keys", "Rotation"],
    steps: [
      {
        title: "Lister les clés d'accès des utilisateurs",
        detail: "Récupérez la liste des clés d'accès pour chaque utilisateur IAM afin de vérifier la date de leur dernière utilisation.",
        command: "aws iam list-users"
      },
      {
        title: "Vérifier la date de dernière utilisation d'une clé d'accès",
        detail: "Utilisez la commande `get-access-key-last-used` pour déterminer quand la clé a été utilisée pour la dernière fois.",
        command: "aws iam get-access-key-last-used --access-key-id <ACCESS_KEY_ID>"
      },
      {
        title: "Trouver la clé dormante",
        detail: "Vous avez trouvé une clé d'accès qui n'a pas été utilisée depuis plus de 90 jours. Le flag attendu est **PCE{AKIA5QYV7B8E9F0G1H2I}**."
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
        detail: "Affichez la liste des politiques gérées et inline attachées aux utilisateurs, groupes ou rôles du compte.",
        command: "aws iam list-policies --scope Local"
      },
      {
        title: "Examiner le contenu des politiques",
        detail: "Vérifiez les versions de la politique pour identifier la présence de l'action `*` accordée sur la ressource `*`.",
        command: "aws iam get-policy-version --policy-arn <POLICY_ARN> --version-id v1"
      },
      {
        title: "Récupérer le flag",
        detail: "Vous avez localisé la politique contenant le wildcard dangereux. Le flag attendu est **PCE{iam_wildcard_admin_policy_2024}**."
      }
    ]
  },
  "2.1.4": {
    context: "Des clés d'accès peuvent parfois être committées accidentellement dans un dépôt de code source (Git), permettant à un attaquant de s'introduire dans votre compte AWS.",
    objective: "Détecter des access keys exposées dans un repo Git.",
    concepts: ["Git", "Secrets Leak", "OSINT", "AWS IAM"],
    steps: [
      {
        title: "Cloner le dépôt cible",
        detail: "Récupérez le dépôt Git suspect sur votre machine locale afin de l'analyser.",
        command: "git clone <REPO_URL>"
      },
      {
        title: "Rechercher des secrets dans l'historique",
        detail: "Utilisez des outils comme `git grep` ou `trufflehog` pour analyser l'historique des commits à la recherche d'identifiants de clés AWS (`AKIA...`).",
        command: "git grep 'AKIA'"
      },
      {
        title: "Identifier la clé exposée",
        detail: "La clé d'accès a été trouvée dans un ancien commit. Le flag attendu est **PCE{git_keys_exposed_2024}**."
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
        detail: "Identifiez les permissions associées à votre utilisateur actuel, notamment si vous pouvez lancer une EC2 et utiliser un rôle spécifique.",
        command: "aws iam get-user-policy --user-name <YOUR_USER> --policy-name <POLICY_NAME>"
      },
      {
        title: "Créer un script de lancement (UserData)",
        detail: "Préparez un script `userdata.sh` qui créera par exemple un reverse shell ou extraira les identifiants IAM temporaires de l'instance et vous les enverra."
      },
      {
        title: "Lancer l'instance EC2 avec le rôle",
        detail: "Utilisez vos droits pour créer une instance en y attachant le rôle cible (Profil d'instance). L'instance s'exécutera avec les droits de ce rôle.",
        command: "aws ec2 run-instances --image-id <AMI_ID> --instance-type t2.micro --iam-instance-profile Name=\"<ROLE_NAME>\" --user-data file://userdata.sh"
      },
      {
        title: "Récupérer le flag",
        detail: "Une fois les identifiants temporaires obtenus via l'instance, utilisez-les pour accomplir une action administrateur et valider le challenge. Le flag attendu est **PCE{passrole_runinstances_privesc_2024}**."
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
        detail: "Listez les utilisateurs IAM et repérez-en un avec un profil Administrateur ou des droits étendus.",
        command: "aws iam list-users"
      },
      {
        title: "Générer de nouvelles clés d'accès",
        detail: "Utilisez vos permissions pour créer une nouvelle clé d'accès pour l'utilisateur cible.",
        command: "aws iam create-access-key --user-name <ADMIN_USER>"
      },
      {
        title: "S'authentifier en tant que cible",
        detail: "Configurez votre CLI AWS avec les nouvelles clés pour prendre l'identité de l'utilisateur à privilèges. Le flag attendu est **PCE{iam_pivot_key_2026}**."
      }
    ]
  },
  "2.2.3": {
    context: "L'autorisation `iam:UpdateAssumeRolePolicy` permet de modifier la relation d'approbation d'un rôle. Un attaquant peut ainsi autoriser son propre compte à assumer un rôle d'administration.",
    objective: "UpdateAssumeRolePolicy pour s'attribuer un rôle admin.",
    concepts: ["AWS IAM", "Trust Policy", "AssumeRole", "Privilege Escalation"],
    steps: [
      {
        title: "Identifier le rôle cible",
        detail: "Repérez un rôle disposant de privilèges élevés que vous souhaitez assumer.",
        command: "aws iam list-roles"
      },
      {
        title: "Préparer la nouvelle politique de confiance",
        detail: "Créez un fichier JSON `trust-policy.json` stipulant que votre utilisateur a le droit de faire `sts:AssumeRole` sur ce rôle."
      },
      {
        title: "Mettre à jour la politique du rôle",
        detail: "Appliquez la politique modifiée au rôle.",
        command: "aws iam update-assume-role-policy --role-name <ADMIN_ROLE> --policy-document file://trust-policy.json"
      },
      {
        title: "Assumer le rôle",
        detail: "Assumer le rôle pour obtenir les privilèges d'administrateur. Le flag attendu est **PCE{update_assume_role_policy_admin_2024}**.",
        command: "aws sts assume-role --role-arn arn:aws:iam::<ACCOUNT_ID>:role/<ADMIN_ROLE> --role-session-name PwnedSession"
      }
    ]
  },
  "2.3.1": {
    context: "L'authentification via OpenID Connect (OIDC) nécessite de vérifier précisément qui se connecte. Si la condition `StringLike` sur le champ `sub` est trop permissive (ex: `repo:MonOrg/*`), n'importe quel dépôt de cette organisation peut obtenir un accès AWS.",
    objective: "OIDC trust misconfiguration (GitHub Actions → accès AWS).",
    concepts: ["AWS IAM", "OIDC", "GitHub Actions", "Trust Policy"],
    steps: [
      {
        title: "Analyser la relation de confiance",
        detail: "Examinez la politique OIDC du rôle IAM. Vous verrez que le champ `sub` autorise une portée trop large (wildcard).",
        command: "aws iam get-role --role-name <OIDC_ROLE>"
      },
      {
        title: "Exploiter la configuration",
        detail: "Créez un nouveau dépôt dans l'organisation concernée (ou utilisez un dépôt existant contrôlé) et configurez une GitHub Action pour assumer le rôle vulnérable."
      },
      {
        title: "Récupérer le flag",
        detail: "Votre workflow GitHub Actions s'exécute, assume le rôle, et récupère le secret. Le flag attendu est **PCE{oidc_trust_wildcard_sub_2024}**."
      }
    ]
  },
  "2.3.2": {
    context: "Les rôles IAM inter-comptes permettent à des utilisateurs d'un autre compte de s'authentifier. Si le rôle ne vérifie pas l'`ExternalId`, il peut être sujet au problème de 'Confused Deputy'.",
    objective: "Cross-account role trust abuse (condition manquante).",
    concepts: ["AWS IAM", "Cross-Account", "Confused Deputy"],
    steps: [
      {
        title: "Identifier le rôle cross-account vulnérable",
        detail: "Analysez les rôles configurés pour des tiers (SaaS, partenaires) et vérifiez si la propriété `ExternalId` est requise.",
        command: "aws iam get-role --role-name <CROSS_ACCOUNT_ROLE>"
      },
      {
        title: "Assumer le rôle depuis un autre compte",
        detail: "Utilisez un accès depuis le compte AWS du tiers pour forcer l'assomption de ce rôle et ainsi accéder aux ressources du compte victime.",
        command: "aws sts assume-role --role-arn arn:aws:iam::<VICTIM_ACCOUNT_ID>:role/<CROSS_ACCOUNT_ROLE> --role-session-name ConfusedDeputy"
      },
      {
        title: "Récupérer l'objectif",
        detail: "L'absence de vérification permet l'escalade de privilèges via l'assomption de rôle non autorisée. Le flag attendu est **PCE{cross_account_trust_abuse_2024}**."
      }
    ]
  },
  "2.3.3": {
    context: "Les assertions SAML sont utilisées pour transmettre des informations d'identité. Une vulnérabilité dans la validation des signatures XML de ces assertions peut permettre à un attaquant de forger une réponse SAML valide pour n'importe quel utilisateur.",
    objective: "SAML assertion manipulation pour escalade.",
    concepts: ["SAML", "XML Signature Wrapping", "Federation"],
    steps: [
      {
        title: "Intercepter la réponse SAML",
        detail: "Connectez-vous via l'Identity Provider (IdP) et interceptez la réponse SAML (XML encodé en base64) avec un proxy comme Burp Suite."
      },
      {
        title: "Manipuler l'assertion",
        detail: "Modifiez l'assertion pour changer votre identité (par ex. pour cibler un rôle `Admin`) en utilisant des techniques de XML Signature Wrapping (XSW) pour contourner la validation de la signature."
      },
      {
        title: "Soumettre la réponse",
        detail: "Envoyez l'assertion modifiée à AWS (au endpoint SAML) pour assumer un rôle avec des droits supérieurs.",
        command: "aws sts assume-role-with-saml --role-arn <ADMIN_ROLE_ARN> --principal-arn <SAML_PROVIDER_ARN> --saml-assertion <BASE64_SAML_ASSERTION>"
      },
      {
        title: "Récupérer le flag",
        detail: "L'élévation de privilèges via l'assertion SAML modifiée a réussi. Le flag attendu est **PCE{saml_sig_bypass_2026}**."
      }
    ]
  }
};
