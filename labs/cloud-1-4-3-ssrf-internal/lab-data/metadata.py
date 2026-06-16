import sys
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/')
def root():
    return "metadata mock server running\n"

@app.route('/latest/meta-data/')
@app.route('/latest/meta-data')
def metadata_root():
    return "iam/\nhostname\nlocal-ipv4\npublic-keys/\n"

@app.route('/latest/meta-data/iam/')
@app.route('/latest/meta-data/iam')
def iam():
    return "security-credentials/\ninfo\n"

@app.route('/latest/meta-data/iam/security-credentials/')
@app.route('/latest/meta-data/iam/security-credentials')
def sec_creds():
    return "ec2-role\n"

@app.route('/latest/meta-data/iam/security-credentials/ec2-role')
def role():
    # Verification basique pour empêcher un simple "curl" par l'utilisateur analyst
    ua = request.headers.get('User-Agent', '')
    if 'curl' in ua.lower():
        return "Access Denied: Direct access is forbidden. Please use the application proxy to access this internal service.\n", 403
        
    return jsonify({
        "Code": "Success",
        "LastUpdated": "2026-06-16T17:48:25Z",
        "Type": "AWS-HMAC",
        "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
        "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "Token": "PCE{ssrf_m3t4d4t4_2026}"
    })

if __name__ == '__main__':
    # Écoute uniquement en local sur le port 8080
    app.run(host='127.0.0.1', port=8080)
