FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="4.2.4"
LABEL com.pceroot.lab.slug="k8s-04-sa-token-abuse"

RUN apk add --no-cache curl jq openssl && \
    adduser -D analyst

RUN mkdir -p /var/run/secrets/kubernetes.io/serviceaccount && \
    echo "eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImRlZmF1bHQtdG9rZW4teHh4eHgiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGVmYXVsdCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpkZWZhdWx0OmRlZmF1bHQifQ.mock_signature" > /var/run/secrets/kubernetes.io/serviceaccount/token && \
    echo "default" > /var/run/secrets/kubernetes.io/serviceaccount/namespace && \
    openssl req -x509 -newkey rsa:4096 -keyout /opt/key.pem -out /var/run/secrets/kubernetes.io/serviceaccount/ca.crt -days 365 -nodes -subj "/CN=127.0.0.1" && \
    chmod -R 444 /var/run/secrets/kubernetes.io/serviceaccount && \
    chmod 444 /opt/key.pem

COPY api_server.py /opt/api_server.py
COPY entrypoint.sh /opt/entrypoint.sh
COPY motd.txt /etc/motd

RUN chmod +x /opt/entrypoint.sh && \
    echo "cat /etc/motd" >> /home/analyst/.profile

ENV KUBERNETES_SERVICE_HOST=127.0.0.1
ENV KUBERNETES_SERVICE_PORT=8443

USER analyst
WORKDIR /home/analyst

CMD ["/opt/entrypoint.sh"]
