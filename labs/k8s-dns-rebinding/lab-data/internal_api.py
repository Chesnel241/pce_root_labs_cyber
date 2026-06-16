#!/usr/bin/env python3
from flask import Flask, request

app = Flask(__name__)

@app.route('/latest/meta-data/')
def metadata():
    # Simulation du endpoint Kubelet / Metadata
    return "PCE{k8s_dns_rebinding_2024}\n"

if __name__ == '__main__':
    # Ne bind que sur localhost
    app.run(host='127.0.0.1', port=8080)
