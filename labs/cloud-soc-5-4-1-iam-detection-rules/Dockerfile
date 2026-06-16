FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="5.4.1"
LABEL com.pceroot.lab.slug="cloud-soc-5-4-1-iam-detection-rules"

RUN adduser -D analyst && \
    apk add --no-cache jq bash

WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY lab-data/cloudtrail.json /home/analyst/cloudtrail.json
COPY lab-data/submit_finding.sh /home/analyst/submit_finding.sh

RUN chown -R analyst:analyst /home/analyst && \
    chmod +x /home/analyst/submit_finding.sh && \
    echo 'cat /etc/motd' >> /home/analyst/.profile

USER analyst
ENV PS1="\u@\h:\w$ "
CMD ["/bin/sh", "-l"]
