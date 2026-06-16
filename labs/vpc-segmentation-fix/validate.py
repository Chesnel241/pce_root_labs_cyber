#!/usr/bin/env python3
import json
import sys

def main():
    try:
        with open('vpc_config.json', 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Erreur lors de la lecture de vpc_config.json : {e}")
        sys.exit(1)

    try:
        private_rtb = data['vpc']['route_tables']['rtb-private']['routes']
    except KeyError:
        print("Erreur: La table de routage 'rtb-private' est introuvable ou mal formatée.")
        sys.exit(1)

    # Check if any route in rtb-private points to an igw
    has_igw_route = False
    for route in private_rtb:
        if route.get('target', '').startswith('igw-'):
            has_igw_route = True
            break

    if has_igw_route:
        print("[-] Échec : La table de routage 'rtb-private' contient toujours une route vers une Internet Gateway (igw-*).")
        print("    Le sous-réseau privé est toujours exposé à Internet.")
        sys.exit(1)

    print("[+] Succès ! La table de routage 'rtb-private' est correctement isolée d'Internet.")
    print("    Voici votre flag : PCE{vpc_segmentation_fixed_2024}")

if __name__ == "__main__":
    main()
