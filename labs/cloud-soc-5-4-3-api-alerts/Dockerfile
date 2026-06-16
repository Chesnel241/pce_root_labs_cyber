FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="5.4.3"
LABEL com.pceroot.lab.slug="cloud-soc-5-4-3-api-alerts"

RUN adduser -D analyst && \
    apk add --no-cache jq bash

WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY lab-data/ /home/analyst/lab-data/

RUN echo "cat /etc/motd" >> /home/analyst/.profile && \
    echo "cat /etc/motd" >> /home/analyst/.bashrc && \
    chown -R analyst:analyst /home/analyst && \
    chmod 755 /home/analyst/lab-data/investigate.py

USER analyst
CMD ["/bin/sh", "-l"]
