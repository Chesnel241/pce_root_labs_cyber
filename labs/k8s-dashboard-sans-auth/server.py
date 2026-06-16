import http.server
import socketserver
import json
import logging

PORT = 8001

class MockK8sDashboard(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"paths":["/api","/api/v1","/apis","/healthz","/version"]}')
            return
            
        if self.path == '/api/v1' or self.path == '/api/v1/':
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"resources":[{"name":"secrets","namespaced":true,"kind":"Secret"},{"name":"pods","namespaced":true,"kind":"Pod"}]}')
            return
            
        if self.path == '/api/v1/namespaces/default/secrets' or self.path == '/api/v1/secrets':
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            response = {
                "kind": "SecretList",
                "apiVersion": "v1",
                "metadata": {"resourceVersion": "12345"},
                "items": [
                    {
                        "metadata": {"name": "default-token-xyz"},
                        "type": "kubernetes.io/service-account-token",
                        "data": {"token": "ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklpSjkuZXlKcGNI...=="}
                    },
                    {
                        "metadata": {"name": "flag-secret"},
                        "type": "Opaque",
                        "data": {"flag": "UENFe2s4c19kNHNoYjA0cmRfbjBfNHV0aF8yMDI2fQ=="}
                    }
                ]
            }
            self.wfile.write(json.dumps(response).encode())
            return
            
        self.send_response(404)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"message": "Not Found"}')

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), MockK8sDashboard) as httpd:
    httpd.serve_forever()
