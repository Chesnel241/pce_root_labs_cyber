import http.server
import socketserver
import json

PORT = 8080

class MockAPIHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/v1/users':
            if self.headers.get('X-API-Key') == 'valid-key':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"users": ["admin", "alice", "bob"]}')
            else:
                self.send_response(401)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Unauthorized"}')
        elif self.path == '/api/v1/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
        elif self.path == '/api/v1/admin/debug':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"flag": "PCE{api_gw_unprotected_2026}", "debug": true}')
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Not Found"}')

    def log_message(self, format, *args):
        pass # Suppress logging to stdout

with socketserver.TCPServer(("", PORT), MockAPIHandler) as httpd:
    httpd.serve_forever()
