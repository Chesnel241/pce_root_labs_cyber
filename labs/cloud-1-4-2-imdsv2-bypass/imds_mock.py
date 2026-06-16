from flask import Flask, request, jsonify
import logging

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
VALID_TOKEN = "AQAAAO-mock-token-1234567890=="

@app.route('/latest/api/token', methods=['PUT'])
def get_token():
    ttl = request.headers.get('X-aws-ec2-metadata-token-ttl-seconds')
    if not ttl:
        return "Missing X-aws-ec2-metadata-token-ttl-seconds header\n", 400
    return VALID_TOKEN, 200

@app.route('/latest/meta-data/', methods=['GET'])
@app.route('/latest/meta-data/<path:path>', methods=['GET'])
def get_meta_data(path=""):
    token = request.headers.get('X-aws-ec2-metadata-token')
    if token != VALID_TOKEN:
        return "Unauthorized: Missing or invalid IMDSv2 token\n", 401
    
    if path == "" or path == "/":
        return "iam/\n"
    elif path == "iam/":
        return "security-credentials/\n"
    elif path == "iam/security-credentials/":
        return "admin\n"
    elif path == "iam/security-credentials/admin":
        return jsonify({
            "Code": "Success",
            "LastUpdated": "2026-06-16T00:00:00Z",
            "Type": "AWS-HMAC",
            "AccessKeyId": "PCE{1mdsv2_byp4ss_h34d3rs_2026}",
            "SecretAccessKey": "MockSecretKey12345",
            "Token": "MockSessionToken12345",
            "Expiration": "2026-06-17T00:00:00Z"
        }), 200
    
    return "404 - Not Found\n", 404

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=9090)
