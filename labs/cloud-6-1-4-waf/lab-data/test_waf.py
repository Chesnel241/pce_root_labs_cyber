#!/usr/bin/env python3
import sys
from waf_rules import is_malicious

FLAG = "PCE{waf_rules_designed_2024}"

test_cases = [
    # Normal traffic
    {"payload": "user=john_doe", "malicious": False},
    {"payload": "id=123", "malicious": False},
    {"payload": "search=cloud+architecture", "malicious": False},
    {"payload": "email=test@example.com", "malicious": False},
    {"payload": "Comment: I love this website!", "malicious": False},
    {"payload": "company=O'Reilly", "malicious": False},

    # SQL Injection
    {"payload": "admin' --", "malicious": True},
    {"payload": "' OR 1=1 --", "malicious": True},
    {"payload": "1; DROP TABLE users", "malicious": True},
    {"payload": "UNION SELECT username, password FROM users", "malicious": True},
    {"payload": "admin' /*", "malicious": True},

    # XSS
    {"payload": "<script>alert('XSS')</script>", "malicious": True},
    {"payload": "<img src=x onerror=alert(1)>", "malicious": True},
    {"payload": "javascript:alert(document.cookie)", "malicious": True},
    {"payload": "<body onload=alert(1)>", "malicious": True},
]

def run_tests():
    passed = 0
    total = len(test_cases)
    
    print("Démarrage des tests du WAF...\n")
    
    for idx, test in enumerate(test_cases, 1):
        payload = test["payload"]
        expected = test["malicious"]
        
        try:
            result = is_malicious(payload)
            if result == expected:
                passed += 1
            else:
                print(f"[-] Test {idx} échoué!")
                print(f"    Payload: {payload}")
                print(f"    Attendu : {'Malveillant' if expected else 'Légitime'}")
                print(f"    Obtenu  : {'Malveillant' if result else 'Légitime'}\n")
        except Exception as e:
            print(f"[-] Erreur lors du test {idx} avec le payload '{payload}': {e}\n")

    print(f"Résultats : {passed} / {total} tests réussis.")
    
    if passed == total:
        print("\n[+] Félicitations ! Votre WAF est robuste.")
        print(f"[+] Voici votre flag : {FLAG}\n")
    else:
        print("\n[-] Votre WAF laisse passer des attaques ou bloque du trafic légitime. Réessayez !\n")

if __name__ == "__main__":
    run_tests()
