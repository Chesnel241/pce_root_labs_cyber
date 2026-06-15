#!/usr/bin/env python3
# =============================================================================
# npm-audit.py — auditeur supply chain (offline) pour projet Node.js.
#
# Analyse package.json + node_modules SANS accès réseau et SANS exécuter le
# moindre script. Il détecte :
#
#   1. Les dépendances ABSENTES de l'allowlist (.npm-allowlist.txt) -> paquets
#      non approuvés (vecteur typosquat).
#   2. Les paquets installés qui déclarent un script de cycle de vie
#      "preinstall" / "install" / "postinstall" -> exécution automatique au
#      moment de "npm install" (vecteur d'exfiltration supply chain).
#
# Quand un paquet non-allowlisté embarque un (post)install script, le scanner
# confirme l'attaque par typosquat et révèle le flag du lab.
#
# Usage : python3 npm-audit.py [chemin_du_projet]
# =============================================================================
import json
import os
import re
import sys

FLAG = "PCE{npm_typosquat_postinstall_2024}"

LIFECYCLE_SCRIPTS = ("preinstall", "install", "postinstall")


def load_json(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def load_allowlist(project):
    path = os.path.join(project, ".npm-allowlist.txt")
    allowed = set()
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line and not line.startswith("#"):
                    allowed.add(line)
    return allowed


def main():
    project = sys.argv[1] if len(sys.argv) > 1 else "."

    print("=== Audit supply chain npm (offline) — pce-checkout-service ===")

    pkg = load_json(os.path.join(project, "package.json"))
    if pkg is None:
        print("Impossible de lire package.json dans : %s" % project)
        return 2

    deps = {}
    deps.update(pkg.get("dependencies", {}))
    deps.update(pkg.get("devDependencies", {}))

    allowlist = load_allowlist(project)
    print("Dependances declarees : %s" % ", ".join(sorted(deps)))
    print("Allowlist (%d entrees) : %s" % (len(allowlist), ", ".join(sorted(allowlist))))
    print("")

    # 1. Dépendances non approuvées (hors allowlist).
    unapproved = sorted(d for d in deps if allowlist and d not in allowlist)

    # 2. Paquets installés avec un script de cycle de vie install/postinstall.
    nm = os.path.join(project, "node_modules")
    install_scripts = []  # (paquet, hook, commande, chemin_du_script_eventuel)
    if os.path.isdir(nm):
        for entry in sorted(os.listdir(nm)):
            mpkg = load_json(os.path.join(nm, entry, "package.json"))
            if not mpkg:
                continue
            scripts = mpkg.get("scripts", {}) or {}
            for hook in LIFECYCLE_SCRIPTS:
                if hook in scripts:
                    cmd = scripts[hook]
                    # On tente de localiser le fichier de script référencé.
                    script_file = None
                    m = re.search(r'([\w./-]+\.js)', cmd)
                    if m:
                        candidate = os.path.join(nm, entry, m.group(1))
                        if os.path.isfile(candidate):
                            script_file = candidate
                    install_scripts.append((entry, hook, cmd, script_file))

    print("--- Findings ------------------------------------------------------")

    if unapproved:
        print("  [ALERTE] Paquet(s) HORS allowlist (potentiel typosquat) :")
        for d in unapproved:
            print("           -> %s@%s  (non approuve)" % (d, deps[d]))
    else:
        print("  [OK] Toutes les dependances sont dans l'allowlist.")

    if install_scripts:
        print("  [ALERTE] Script(s) de cycle de vie install/postinstall detecte(s) :")
        for entry, hook, cmd, sf in install_scripts:
            print('           -> %s : "%s": "%s"' % (entry, hook, cmd))
            if sf:
                print("              fichier : %s" % sf)
    else:
        print("  [OK] Aucun script install/postinstall dans node_modules.")

    print("")

    # Corrélation : un paquet HORS allowlist QUI embarque un script (post)install
    # = signature d'un typosquat malveillant.
    malicious = []
    for entry, hook, cmd, sf in install_scripts:
        if entry in unapproved:
            malicious.append((entry, hook, cmd, sf))

    if malicious:
        entry, hook, cmd, sf = malicious[0]
        print("--- Conclusion ----------------------------------------------------")
        print("  [CRITIQUE] Dependance typosquattee MALVEILLANTE confirmee :")
        print("             paquet '%s' (hors allowlist) execute un script '%s'" % (entry, hook))
        print("             AUTOMATIQUEMENT a l'installation (npm install).")
        if sf:
            # On lit (sans exécuter) la charge utile pour en extraire le marqueur.
            try:
                with open(sf, "r", encoding="utf-8", errors="replace") as fh:
                    payload = fh.read()
            except OSError:
                payload = ""
            fm = re.search(r"PCE\{[^}]+\}", payload)
            if fm:
                print("")
                print("             Marqueur trouve dans la charge utile (%s) :" % os.path.basename(sf))
                print("             %s" % fm.group(0))
        print("")
        print("  Drapeau du lab : %s" % FLAG)
        print("")
        print("  Remediation : voir README.md (lockfile, allowlist, --ignore-scripts).")
        return 0

    print("--- Conclusion ----------------------------------------------------")
    print("  [i] Aucun typosquat malveillant confirme pour l'instant.")
    print("  Continuez : croisez les paquets HORS allowlist avec ceux qui ont")
    print("  un script (post)install dans node_modules/<pkg>/package.json.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
