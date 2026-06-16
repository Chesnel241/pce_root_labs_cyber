#!/bin/sh
# Mock curl wrapper for mTLS lab

if echo "$*" | grep -q "https://api.internal/flag"; then
    if echo "$*" | grep -q -- "--cert" && echo "$*" | grep -q -- "--key"; then
        if echo "$*" | grep -q "client.crt" && echo "$*" | grep -q "client.key"; then
            echo '{"status": 200, "message": "Authentication successful. Here is your flag: PCE{mTLS_auth_successful_2024}"}'
            exit 0
        else
            echo "curl: (58) could not load PEM client certificate, OpenSSL error: No such file or directory or invalid certificate"
            exit 58
        fi
    else
        echo "curl: (35) error:14094412:SSL routines:ssl3_read_bytes:sslv3 alert bad certificate"
        exit 35
    fi
elif echo "$*" | grep -q "https://api.internal"; then
    echo "404 Not Found"
    exit 0
else
    # Fallback to real curl for other domains
    /usr/bin/curl "$@"
fi
