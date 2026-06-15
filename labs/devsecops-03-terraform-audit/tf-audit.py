#!/usr/bin/env python3
# =============================================================================
# tf-audit.py — auditeur statique (offline) de configurations Terraform.
#
# Analyse les fichiers *.tf du répertoire courant (ou du chemin fourni) et
# détecte 5 catégories de misconfigurations de sécurité AWS classiques :
#
#   1. S3_PUBLIC       — bucket S3 exposé publiquement (acl public-read/-write)
#   2. SG_OPEN         — security group avec ingress depuis 0.0.0.0/0
#   3. UNENCRYPTED     — stockage non chiffré (volume EBS et/ou bucket S3)
#   4. HARDCODED_SECRET— secret / mot de passe codé en dur dans le code
#   5. RDS_PUBLIC      — base RDS accessible publiquement
#
# Si les 5 catégories sont détectées, l'audit révèle le flag du lab.
# Aucun accès réseau, aucun provider, aucune dépendance externe : 100% offline.
#
# Usage : python3 tf-audit.py [chemin_vers_fichiers_tf]
# =============================================================================
import os
import re
import sys

FLAG = "PCE{terraform_five_misconfigs_2024}"

# Les 5 catégories attendues (ordre d'affichage).
CATEGORIES = [
    ("S3_PUBLIC", "Bucket S3 exposé publiquement (ACL public-read/public-write)"),
    ("SG_OPEN", "Security group ouvert au monde (ingress 0.0.0.0/0)"),
    ("UNENCRYPTED", "Stockage non chiffre au repos (volume EBS / bucket S3)"),
    ("HARDCODED_SECRET", "Secret / mot de passe code EN DUR dans le code"),
    ("RDS_PUBLIC", "Base RDS accessible publiquement (publicly_accessible)"),
]


def load_tf(path):
    """Charge le texte de tous les fichiers *.tf sous `path`."""
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return {path: fh.read()}
    blobs = {}
    for root, _dirs, files in os.walk(path):
        for name in sorted(files):
            if name.endswith(".tf"):
                full = os.path.join(root, name)
                with open(full, "r", encoding="utf-8", errors="replace") as fh:
                    blobs[full] = fh.read()
    return blobs


def detect(blobs):
    """Retourne {categorie: [ (fichier, ligne, extrait), ... ]}."""
    findings = {key: [] for key, _ in CATEGORIES}

    for fname, text in blobs.items():
        lines = text.splitlines()
        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            # On ignore les lignes de commentaire (# ou //).
            if stripped.startswith("#") or stripped.startswith("//"):
                continue
            low = line.lower()

            # 1. S3 public via ACL.
            if re.search(r'acl\s*=\s*"public-(read|read-write|write)"', low):
                findings["S3_PUBLIC"].append((fname, idx, stripped))

            # 2. Security group ouvert (0.0.0.0/0 dans un cidr_blocks ingress).
            if "0.0.0.0/0" in line and "cidr_blocks" in low:
                findings["SG_OPEN"].append((fname, idx, stripped))

            # 3. Stockage non chiffre (encrypted = false).
            if re.search(r'encrypted\s*=\s*false', low):
                findings["UNENCRYPTED"].append((fname, idx, stripped))

            # 5. RDS publiquement accessible.
            if re.search(r'publicly_accessible\s*=\s*true', low):
                findings["RDS_PUBLIC"].append((fname, idx, stripped))

            # 6 (-> catégorie HARDCODED_SECRET). Mot de passe / secret en dur.
            if re.search(r'(password|secret|token)\s*=\s*"[^"]+"', low):
                # On évite les faux positifs sur les références de variables.
                value = line.split("=", 1)[1].strip()
                if not value.startswith('"${') and not value.startswith("var."):
                    findings["HARDCODED_SECRET"].append((fname, idx, stripped))

        # 3 (bis). Bucket S3 sans bloc de chiffrement -> non chiffre au repos.
        # On ne tient compte que des déclarations SSE hors commentaires.
        code_lines = [
            ln for ln in lines
            if not ln.strip().startswith("#") and not ln.strip().startswith("//")
        ]
        code_text = "\n".join(code_lines)
        sse_declared = ("server_side_encryption" in code_text)
        for m in re.finditer(r'resource\s+"aws_s3_bucket"\s+"([^"]+)"\s*{', text):
            name = m.group(1)
            # Heuristique offline : aucune SSE déclarée dans le code (ni inline,
            # ni via une ressource dédiée) -> bucket non chiffré au repos.
            if not sse_declared:
                line_no = text[: m.start()].count("\n") + 1
                findings["UNENCRYPTED"].append(
                    (fname, line_no, 'aws_s3_bucket "%s" sans chiffrement (aucune SSE)' % name)
                )

    return findings


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    blobs = load_tf(target)

    print("=== Audit Terraform (offline) — pce-data-platform ===")
    if not blobs:
        print("Aucun fichier .tf trouve dans : %s" % target)
        return 2
    print("Fichiers analyses : %s" % ", ".join(sorted(blobs.keys())))
    print("")

    findings = detect(blobs)

    detected = 0
    for key, label in CATEGORIES:
        hits = findings[key]
        if hits:
            detected += 1
            print("  [FAIL] %-17s %s" % (key, label))
            for fname, line_no, extrait in hits:
                print("         -> %s:%d  %s" % (os.path.basename(fname), line_no, extrait))
        else:
            print("  [PASS] %-17s %s" % (key, label))

    total = len(CATEGORIES)
    print("")
    print("  Misconfigurations detectees : %d/%d" % (detected, total))
    print("")

    if detected >= total:
        print("  [!] Les %d categories de misconfiguration sont presentes." % total)
        print("  Vous avez identifie l'ensemble des failles de cette infrastructure.")
        print("")
        print("  Drapeau du lab : %s" % FLAG)
        print("")
        print("  Corrigez chaque finding (voir README.md) puis re-deployez sereinement.")
        return 0

    print("  [i] Continuez l'audit : %d categorie(s) restante(s) a identifier." % (total - detected))
    return 1


if __name__ == "__main__":
    sys.exit(main())
