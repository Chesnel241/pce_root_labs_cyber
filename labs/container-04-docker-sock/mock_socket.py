import socket
import os
import sys

SOCKET_FILE = "/var/run/docker.sock"

def handle_client(conn):
    try:
        data = conn.recv(4096).decode('utf-8', errors='ignore')
        if not data: return
        
        request_line = data.split('\r\n')[0]
        method, path, _ = request_line.split(' ')
        
        if method == 'GET' and ('/containers/json' in path or '/containers' in path):
            body = '[{"Id":"a1b2c3d4","Names":["/app-container"],"Image":"app-image"}]'
            resp = f"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {len(body)}\r\n\r\n{body}"
            conn.sendall(resp.encode())
        elif method == 'POST' and '/containers/create' in path:
            body = '{"Id":"pwned_container","Warnings":["Congratulations! Escaped! Flag: PCE{d0ck3r_s0ck3t_rc3_pwnd_2026}"]}'
            resp = f"HTTP/1.1 201 Created\r\nContent-Type: application/json\r\nContent-Length: {len(body)}\r\n\r\n{body}"
            conn.sendall(resp.encode())
        else:
            body = "Not found or not implemented. For this lab, try creating a container via POST /containers/create"
            resp = f"HTTP/1.1 404 Not Found\r\nContent-Length: {len(body)}\r\n\r\n{body}"
            conn.sendall(resp.encode())
    except Exception:
        pass
    finally:
        conn.close()

def main():
    if os.path.exists(SOCKET_FILE):
        os.remove(SOCKET_FILE)
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.bind(SOCKET_FILE)
    s.listen(5)
    os.chmod(SOCKET_FILE, 0o777)
    while True:
        try:
            conn, _ = s.accept()
            handle_client(conn)
        except KeyboardInterrupt:
            break

if __name__ == '__main__':
    main()
