import http.server
import socketserver
import json
import ssl
import sys

PORT = 8443

class K8sAPIHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        auth_header = self.headers.get('Authorization')
        
        try:
            with open("/var/run/secrets/kubernetes.io/serviceaccount/token", "r") as f:
                expected_token = f.read().strip()
        except Exception:
            expected_token = ""
            
        if not auth_header or auth_header != f"Bearer {expected_token}":
            self.send_response(401)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"kind":"Status","apiVersion":"v1","metadata":{},"status":"Failure","message":"Unauthorized","reason":"Unauthorized","code":401}\n')
            return

        if self.path == '/api/v1/namespaces/default/secrets':
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            response = {
                "kind": "SecretList",
                "apiVersion": "v1",
                "metadata": {},
                "items": [
                    {
                        "metadata": {"name": "flag-secret"},
                        "type": "Opaque",
                        "data": {"flag": "UENFe2s4c19zYV90b2tlbl9hYnVzZWRfMjAyNH0="}
                    }
                ]
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(403)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"kind":"Status","apiVersion":"v1","metadata":{},"status":"Failure","message":"Forbidden","reason":"Forbidden","code":403}\n')

    def log_message(self, format, *args):
        pass # Suppress logs to keep terminal clean for the user

try:
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), K8sAPIHandler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt', '/opt/key.pem')
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()
except Exception as e:
    print(f"Failed to start API Server: {e}", file=sys.stderr)
