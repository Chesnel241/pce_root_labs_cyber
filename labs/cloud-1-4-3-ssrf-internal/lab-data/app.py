import sys
from flask import Flask, request, Response
import urllib.request
import urllib.error

app = Flask(__name__)

@app.route('/')
def index():
    return "Bienvenue sur le proxy d'images. Utilisez l'endpoint /proxy?url=<votre_url>"

@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    if not url:
        return "Erreur: Paramètre 'url' manquant.\n", 400
    
    try:
        # Configuration basique pour récupérer la ressource
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            content = response.read()
            return Response(content, status=200, mimetype=response.headers.get('Content-Type', 'text/plain'))
    except urllib.error.URLError as e:
        return f"Erreur de résolution de l'URL: {e.reason}\n", 500
    except Exception as e:
        return f"Erreur inattendue: {str(e)}\n", 500

if __name__ == '__main__':
    # Écoute publiquement sur le port 8000
    app.run(host='0.0.0.0', port=8000)
