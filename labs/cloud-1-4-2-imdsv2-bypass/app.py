from flask import Flask, request
import urllib.request
import logging

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)

@app.route('/fetch', methods=['GET', 'POST'])
def fetch():
    url = request.args.get('url')
    if not url:
        return "Usage: /fetch?url=<target_url>&method=<GET|PUT>&header=Key:Value\n", 400
    
    custom_headers = request.args.getlist('header')
    method = request.args.get('method', 'GET').upper()
    
    try:
        req = urllib.request.Request(url, method=method)
        for h in custom_headers:
            if ':' in h:
                key, val = h.split(':', 1)
                req.add_header(key.strip(), val.strip())

        with urllib.request.urlopen(req, timeout=3) as response:
            return response.read(), response.status
    except urllib.error.URLError as e:
        if hasattr(e, 'read'):
            return e.read(), getattr(e, 'code', 500)
        return str(e) + "\n", 500
    except Exception as e:
        return str(e) + "\n", 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return "SSRF Proxy Service v1.0 running. Try /fetch endpoint.\n", 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080)
