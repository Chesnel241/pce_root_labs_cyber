import http.server
import socketserver
import urllib.parse
import posixpath

PORT = 8080

class IngressMockHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Suppress logging

    def do_GET(self):
        # self.path contains the exact request URI including query params
        parsed_url = urllib.parse.urlparse(self.path)
        raw_path = parsed_url.path
        
        # Vulnerable Ingress logic:
        # Simulates Nginx rewrite-target misconfiguration:
        # e.g., nginx.ingress.kubernetes.io/rewrite-target: /$2
        #       path: /app(/|$)(.*)
        if raw_path.startswith('/app'):
            # Simulate Ingress proxy pass stripping the /app prefix
            backend_path = raw_path[4:]
            if not backend_path.startswith('/'):
                backend_path = '/' + backend_path
                
            # Simulate backend receiving the request and normalizing the path
            decoded_path = urllib.parse.unquote(backend_path)
            backend_normalized = posixpath.normpath(decoded_path)
            
            if backend_normalized == '/admin' or backend_normalized.startswith('/admin/'):
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b"Welcome to the internal admin panel.\nFlag: PCE{ingr3ss_byp4ss_2026}\n")
            elif backend_normalized == '/' or backend_normalized.startswith('/index'):
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b"Welcome to the public app. Nothing to see here.\n")
            else:
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b"404 Not Found on Backend\n")
        else:
            self.send_response(403)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"403 Forbidden - Direct backend access not allowed via this Ingress path.\n")

if __name__ == "__main__":
    # Run on localhost
    with socketserver.TCPServer(("127.0.0.1", PORT), IngressMockHandler) as httpd:
        httpd.serve_forever()
