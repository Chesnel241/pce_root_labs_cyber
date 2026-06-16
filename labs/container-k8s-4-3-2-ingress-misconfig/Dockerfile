FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="4.3.2" \
      com.pceroot.lab.slug="container-k8s-4-3-2-ingress-misconfig"

RUN apk add --no-cache curl

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY server.py /opt/server.py

# Start the mock server on login
RUN echo "cat /etc/motd" >> /etc/profile && \
    echo "nohup python3 /opt/server.py > /dev/null 2>&1 &" >> /etc/profile && \
    chown analyst:analyst /opt/server.py

USER analyst

CMD ["/bin/sh", "-l"]
