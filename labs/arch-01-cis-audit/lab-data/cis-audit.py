#!/usr/bin/env python3
"""
cis-audit.py — auditeur CIS AWS Foundations Benchmark (extrait) pour le lab
arch-01-cis-audit.

Lit la configuration du compte (account-config.json) et évalue une sélection de
contrôles CIS. Chaque contrôle est PASS / FAIL avec une sévérité. Le script
calcule un score (% de contrôles critiques au vert) et, lorsque TOUS les
contrôles critiques passent, révèle le flag du lab.

100 % hors-ligne et déterministe : aucune API AWS, tout est statique.

Usage :  python3 cis-audit.py [chemin/vers/account-config.json]
"""

import json
import os
import sys

FLAG = "PCE{cis_public_s3_block_2024}"

HERE = os.path.dirname(os.path.abspath(__file__))


def load_config(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def evaluate(cfg):
    """Retourne la liste des contrôles évalués: (id, intitulé, sévérité, ok)."""
    iam = cfg.get("iam", {})
    pw = iam.get("passwordPolicy", {})
    s3 = cfg.get("s3", {})
    bpa = s3.get("blockPublicAccess", {})
    ct = cfg.get("cloudtrail", {})
    ec2 = cfg.get("ec2", {})
    awscfg = cfg.get("config", {})

    return [
        ("CIS 1.5", "MFA activé sur le compte root", "CRITIQUE",
         iam.get("rootMfaEnabled") is True),
        ("CIS 1.8", "Longueur minimale du mot de passe >= 14", "MOYENNE",
         pw.get("minimumLength", 0) >= 14),
        ("CIS 1.14", "Rotation des access keys <= 90 jours", "MOYENNE",
         iam.get("accessKeysRotatedDays", 999) <= 90),
        ("CIS 2.1.5", "S3 Block Public Access activé au niveau du compte", "CRITIQUE",
         bpa.get("accountLevel") is True),
        ("CIS 3.1", "CloudTrail activé (multi-régions)", "CRITIQUE",
         ct.get("enabled") is True and ct.get("multiRegion") is True),
        ("CIS 3.2", "Validation d'intégrité des fichiers de log CloudTrail", "MOYENNE",
         ct.get("logFileValidation") is True),
        ("CIS 2.2.1", "Chiffrement EBS par défaut activé", "MOYENNE",
         ec2.get("ebsEncryptionByDefault") is True),
        ("CIS 5.3", "Security group par défaut restreint", "MOYENNE",
         ec2.get("defaultSecurityGroupRestricted") is True),
        ("CIS 3.5", "AWS Config recorder activé", "MOYENNE",
         awscfg.get("recorderEnabled") is True),
    ]


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "account-config.json")
    cfg = load_config(path)
    results = evaluate(cfg)

    print("=== Audit CIS AWS Foundations Benchmark — compte %s ===" % cfg.get("account", "?"))
    print()
    crit_total = crit_pass = 0
    for cid, title, sev, ok in results:
        status = "PASS" if ok else "FAIL"
        marker = " " if ok else " <== A CORRIGER"
        print("  [%s] %-9s %-9s %s%s" % (status, cid, "(%s)" % sev, title, marker))
        if sev == "CRITIQUE":
            crit_total += 1
            crit_pass += 1 if ok else 0

    score = int(round(100 * crit_pass / crit_total)) if crit_total else 0
    print()
    print("  Contrôles critiques au vert : %d/%d  (score critique : %d%%)" % (crit_pass, crit_total, score))
    print()

    if crit_pass == crit_total:
        print("  [OK] Tous les contrôles CRITIQUES sont conformes. Audit validé.")
        print("  Drapeau du lab : " + FLAG)
        return 0

    print("  [!] Audit NON conforme : corrigez les contrôles critiques en échec.")
    print("      Indice : un bucket/compte sans S3 Block Public Access expose vos")
    print("      données. Éditez account-config.json puis relancez l'audit.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
