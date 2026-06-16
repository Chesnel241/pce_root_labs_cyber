#!/usr/bin/env python3
# Squelette pour un serveur DNS malveillant (DNS Rebinding)
import socket
from dnslib.server import DNSServer, BaseResolver
from dnslib import RR, QTYPE, A

class RebindResolver(BaseResolver):
    def __init__(self):
        self.request_count = 0

    def resolve(self, request, handler):
        reply = request.reply()
        qname = request.q.qname
        
        # TODO: Implémentez la logique de DNS rebinding ici
        # Retournez une IP publique (ex: 8.8.8.8) à la première requête (Time of Check)
        # Retournez 127.0.0.1 aux requêtes suivantes (Time of Use)
        # Assurez-vous que le TTL est défini à 0 pour éviter la mise en cache
        
        # Exemple basique: (A CHANGER)
        ip = "8.8.8.8" 
        
        reply.add_answer(RR(qname, QTYPE.A, rdata=A(ip), ttl=0))
        return reply

if __name__ == '__main__':
    print("[*] Démarrage du serveur DNS sur 127.0.0.1:53...")
    resolver = RebindResolver()
    
    # Note: L'écoute sur le port 53 nécessite les privilèges root (sudo)
    server = DNSServer(resolver, port=53, address="127.0.0.1")
    try:
        server.start()
    except KeyboardInterrupt:
        pass
    except PermissionError:
        print("[-] Erreur: Vous devez lancer ce script avec 'sudo' pour utiliser le port 53.")
