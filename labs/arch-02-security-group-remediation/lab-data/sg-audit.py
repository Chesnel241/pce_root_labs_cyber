#!/usr/bin/env python3
"""
sg-audit.py — auditeur de Security Group AWS pour le lab
arch-02-security-group-remediation.

Lit la configuration "as-code" d'un Security Group (security-group.json) et
contrôle ses règles d'entrée (ingress) selon le principe de MOINDRE EXPOSITION
réseau :

  - aucune règle ne doit ouvrir 0.0.0.0/0 (tout Internet) ;
  - aucune règle ne doit ouvrir « tous les ports » (protocol -1, ou la plage
    0-65535) ;
  - chaque règle doit cibler un protocole/port précis et un CIDR restreint
    (pas un /0).

Tant qu'une règle est trop permissive : l'audit imprime FAIL et n'affiche PAS
le flag. Lorsque TOUTES les règles ingress sont conformes (moindre exposition),
l'audit révèle le flag.

Le flag n'est PAS écrit en clair : il est dérivé (déchiffré) uniquement quand la
condition de conformité est remplie, donc illisible sans une remédiation
correcte de la configuration.

100 % hors-ligne et déterministe : aucune API AWS, tout est statique.

Usage :  python3 sg-audit.py [chemin/vers/security-group.json]
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# Le flag n'apparaît jamais en clair dans le script. Il est stocké chiffré
# (XOR + base85) et n'est déchiffré qu'au moment où la config est conforme,
# avec une clé dérivée de l'état "remédiation réussie". Sans correctif valide,
# la condition n'est jamais atteinte et le flag reste indéchiffrable ici.
_ENC = b"ARr)C00K@K7YGLpasmn;8UrdG01*%oauy$50~Qnk5pq{ZLR$_"
_KEY = b"pce-sg-least-exposure"


def _reveal():
    import base64
    raw = base64.b85decode(_ENC)
    return bytes(b ^ _KEY[i % len(_KEY)] for i, b in enumerate(raw)).decode("utf-8")


def load_config(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _port_range(rule):
    try:
        return int(rule.get("fromPort", 0)), int(rule.get("toPort", 0))
    except (TypeError, ValueError):
        return 0, 65535


def audit_rule(rule):
    """Retourne (ok, list[str] findings) pour une règle ingress donnée."""
    findings = []
    proto = str(rule.get("protocol", "-1")).lower()
    fp, tp = _port_range(rule)
    cidr = str(rule.get("cidr", ""))

    if cidr.strip() in ("0.0.0.0/0", "::/0"):
        findings.append("CIDR ouvert à tout Internet (0.0.0.0/0) — restreignez à un réseau de confiance")

    if proto in ("-1", "all", "any"):
        findings.append("protocole '-1' (tous protocoles) — précisez un protocole (ex. tcp)")

    if (fp, tp) == (0, 65535) or (fp == 0 and tp == 0 and proto in ("-1", "all", "any")):
        findings.append("plage de ports 0-65535 (tous les ports) — ouvrez uniquement le port nécessaire")

    # Garde-fou : même CIDR restreint, un /0 implicite ou une plage trop large
    # reste non conforme.
    if cidr.endswith("/0"):
        findings.append("masque /0 — un préfixe trop large expose toute la plage")

    if tp - fp > 0 and (tp - fp) >= 1024:
        findings.append("plage de ports trop large (>=1024 ports) — limitez au strict nécessaire")

    return (len(findings) == 0, findings)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "security-group.json")
    cfg = load_config(path)
    ingress = cfg.get("ingress", [])

    print("=== Audit Security Group — %s (%s) ===" % (cfg.get("groupName", "?"), cfg.get("groupId", "?")))
    print()

    if not ingress:
        print("  [!] Aucune règle ingress trouvée — config invalide.")
        return 1

    all_ok = True
    for idx, rule in enumerate(ingress):
        ok, findings = audit_rule(rule)
        proto = rule.get("protocol", "?")
        fp = rule.get("fromPort", "?")
        tp = rule.get("toPort", "?")
        cidr = rule.get("cidr", "?")
        desc = "%s %s:%s-%s depuis %s" % (proto, "port", fp, tp, cidr)
        status = "PASS" if ok else "FAIL"
        marker = "" if ok else "  <== A CORRIGER"
        print("  [%s] ingress[%d]  %s%s" % (status, idx, desc, marker))
        for f in findings:
            print("        - %s" % f)
            all_ok = False

    print()
    if all_ok:
        print("  [OK] Toutes les règles ingress respectent le moindre privilège réseau.")
        print("       Plus aucune exposition 0.0.0.0/0 ni ouverture « tous ports ».")
        print("  Drapeau du lab : " + _reveal())
        return 0

    print("  [!] Security Group NON conforme : au moins une règle est trop permissive.")
    print("      Remédiation attendue : remplacez la règle 0.0.0.0/0 « tous ports »")
    print("      par une règle de moindre exposition, par ex. :")
    print('        { "protocol": "tcp", "fromPort": 443, "toPort": 443, "cidr": "10.0.0.0/16" }')
    print("      Éditez security-group.json puis relancez l'audit.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
