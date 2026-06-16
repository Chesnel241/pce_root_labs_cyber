FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="4.2.2"
LABEL com.pceroot.lab.slug="k8s-dashboard-sans-auth"

RUN adduser -D analyst
RUN apk add --no-cache curl jq bash

COPY motd.txt /etc/motd
COPY server.py /opt/server.py
COPY entrypoint.sh /opt/entrypoint.sh

RUN chmod +x /opt/entrypoint.sh
RUN echo '[ ! -z "$TERM" -a -r /etc/motd ] && cat /etc/motd' >> /etc/profile

USER analyst
WORKDIR /home/analyst

CMD ["/opt/entrypoint.sh"]
