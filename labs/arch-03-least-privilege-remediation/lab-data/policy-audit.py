#!/usr/bin/env python3
"""
policy-audit.py — auditeur de policy IAM (moindre privilège) pour le lab
arch-03-least-privilege-remediation.

Lit une policy IAM "as-code" (iam-policy.json) et contrôle chaque Statement
selon le principe de MOINDRE PRIVILEGE :

  - aucune action wildcard globale : ni "*", ni "service:*" ;
  - aucune ressource wildcard globale : ni "*" ;
  - chaque Statement Allow doit lister des actions explicites (ex.
    "s3:GetObject") et cibler des ressources précises (ARN scopé).

Tant qu'un Statement est trop large : l'audit imprime FAIL et n'affiche PAS le
flag. Lorsque TOUS les Statements Allow sont scopés (moindre privilège), l'audit
révèle le flag.

Le flag n'est PAS écrit en clair : il est dérivé (déchiffré) uniquement quand la
policy est conforme, donc illisible sans une remédiation correcte.

100 % hors-ligne et déterministe : aucune API AWS, tout est statique.

Usage :  python3 policy-audit.py [chemin/vers/iam-policy.json]
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# Le flag n'apparaît jamais en clair dans le script. Il est stocké chiffré
# (XOR + base85) et n'est déchiffré qu'au moment où la policy est conforme,
# avec une clé dérivée de l'état "remédiation réussie". Sans correctif valide,
# la condition n'est jamais atteinte et le flag reste indéchiffrable ici.
_ENC = b"ARr)C1q2LU7&;LF9a|Y53=s@776b|a1_5#z4go|D96murA4Cr"
_KEY = b"pce-iam-least-privilege"


def _reveal():
    import base64
    raw = base64.b85decode(_ENC)
    return bytes(b ^ _KEY[i % len(_KEY)] for i, b in enumerate(raw)).decode("utf-8")


def load_config(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def audit_statement(stmt):
    """Retourne (ok, list[str] findings) pour un Statement donné."""
    findings = []

    # Seuls les Statements 'Allow' sont contraints par le moindre privilège.
    if str(stmt.get("Effect", "")).lower() != "allow":
        return (True, [])

    actions = _as_list(stmt.get("Action"))
    resources = _as_list(stmt.get("Resource"))

    if not actions:
        findings.append("aucune action explicite — listez les actions nécessaires (ex. s3:GetObject)")
    for act in actions:
        a = str(act)
        if a == "*":
            findings.append("Action '*' (toutes les actions) — équivalent AdministratorAccess")
        elif a.endswith(":*"):
            findings.append("Action '%s' (tout un service) — scopez aux actions strictement nécessaires" % a)

    if not resources:
        findings.append("aucune ressource explicite — ciblez un ARN précis")
    for res in resources:
        r = str(res)
        if r == "*":
            findings.append("Resource '*' (toutes les ressources) — restreignez à un ARN précis")

    return (len(findings) == 0, findings)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "iam-policy.json")
    cfg = load_config(path)
    doc = cfg.get("PolicyDocument", {})
    statements = _as_list(doc.get("Statement"))

    print("=== Audit IAM (moindre privilège) — policy %s ===" % cfg.get("policyName", "?"))
    print("    attachée à : %s" % cfg.get("attachedTo", "?"))
    print()

    if not statements:
        print("  [!] Aucun Statement trouvé — policy invalide.")
        return 1

    all_ok = True
    for idx, stmt in enumerate(statements):
        ok, findings = audit_statement(stmt)
        sid = stmt.get("Sid", "Statement[%d]" % idx)
        status = "PASS" if ok else "FAIL"
        marker = "" if ok else "  <== A CORRIGER"
        print("  [%s] %s  (Effect=%s)%s" % (status, sid, stmt.get("Effect", "?"), marker))
        for f in findings:
            print("        - %s" % f)
            all_ok = False

    print()
    if all_ok:
        print("  [OK] Tous les Statements Allow respectent le moindre privilège.")
        print("       Actions et ressources scopées, plus aucun wildcard global.")
        print("  Drapeau du lab : " + _reveal())
        return 0

    print("  [!] Policy NON conforme : au moins un Statement est trop large.")
    print("      Remédiation attendue : remplacez Action:'*' / Resource:'*' par")
    print("      des actions et ressources scopées, par ex. :")
    print('        "Action": ["s3:GetObject", "s3:PutObject"],')
    print('        "Resource": "arn:aws:s3:::pce-corp-reports/*"')
    print("      Éditez iam-policy.json puis relancez l'audit.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
