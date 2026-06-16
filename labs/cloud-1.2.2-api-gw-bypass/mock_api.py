import http.server
import socketserver
import urllib.parse
import posixpath

PORT = 8080
FLAG = "PCE{api_gateway_path_normalization_bypass_2024}"

class MockAPIGateway(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # The vulnerable API Gateway logic
        # Gateway applies auth only if the raw path starts with /admin
        raw_path = self.path
        
        # Gateway Auth Check
        if raw_path.startswith("/admin"):
            auth_header = self.headers.get("Authorization")
            if not auth_header or auth_header != "Bearer secret_token":
                self.send_response(403)
                self.end_headers()
                self.wfile.write(b"403 Forbidden: Missing or invalid token for /admin\n")
                return
                
        # Backend routing normalizes the path!
        # This simulates how a backend web server might process the path differently
        parsed_path = urllib.parse.urlparse(raw_path).path
        normalized_path = posixpath.normpath(parsed_path)
        
        if normalized_path == "/admin":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(f"200 OK. Welcome Admin! Here is your flag: {FLAG}\n".encode())
        elif normalized_path == "/public":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"200 OK. Public endpoint. No auth required.\n")
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found\n")

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), MockAPIGateway) as httpd:
        httpd.serve_forever()
