#!/usr/bin/env python3
import socket
import urllib.request
import urllib.parse
import sys

def fetch_url(url):
    parsed = urllib.parse.urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        print("[-] Erreur: URL invalide")
        return

    # Etape 1: Resolution DNS (Time Of Check)
    try:
        ip = socket.gethostbyname(hostname)
    except Exception as e:
        print(f"[-] Echec de la resolution DNS pour {hostname}: {e}")
        return
        
    print(f"[*] Analyse de securite: Resolution de {hostname} -> {ip}")
    
    # Verification contre les SSRF
    if ip.startswith("127.") or ip.startswith("169.254.") or ip.startswith("10.") or ip in ["0.0.0.0", "localhost"]:
        print("[-] ALERTE SECURITE: Acces aux adresses IP internes bloque!")
        return
        
    print("[+] Controle de securite reussi. Adresse IP autorisee.")
    print(f"[*] Telechargement de l'URL: {url}")
    
    # Etape 2: Telechargement (Time Of Use)
    # Note: urllib va a nouveau resoudre le nom d'hote
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            content = response.read().decode('utf-8')
            print(f"[+] Reponse:\n{content}")
    except Exception as e:
        print(f"[-] Echec du telechargement: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <url>")
        sys.exit(1)
    fetch_url(sys.argv[1])
