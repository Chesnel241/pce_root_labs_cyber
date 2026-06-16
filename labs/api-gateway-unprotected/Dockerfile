FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="1.1.3" \
      com.pceroot.lab.slug="api-gateway-unprotected"

RUN apk add --no-cache curl jq bash
RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY api_server.py /opt/api_server.py
COPY swagger.json /home/analyst/swagger.json
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chown analyst:analyst /home/analyst/swagger.json

USER analyst
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/sh", "-l"]
