import http.server
import socketserver
import json
import os

class LambdaHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            event = json.loads(post_data)
            target = event.get('target', '127.0.0.1')
            
            # The vulnerability: Command injection via unescaped input
            cmd = f"ping -c 1 {target}"
            result = os.popen(cmd).read()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                "statusCode": 200,
                "body": result
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

    # Suppress logging
    def log_message(self, format, *args):
        pass

PORT = 8080
print(f"Starting mock Lambda server on port {PORT}")
with socketserver.TCPServer(("127.0.0.1", PORT), LambdaHandler) as httpd:
    httpd.serve_forever()
