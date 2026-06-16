#!/usr/bin/env python3
import sys

EXPECTED_AK = "AKIA1234567890EXAMPLE"
EXPECTED_SK = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

if len(sys.argv) != 3:
    print("Usage: verify-keys <AccessKeyId> <SecretAccessKey>")
    sys.exit(1)

if sys.argv[1] == EXPECTED_AK and sys.argv[2] == EXPECTED_SK:
    print("Authentification réussie !")
    print("Flag: PCE{git_keys_exposed_2024}")
else:
    print("Erreur : Clés d'accès invalides.")
