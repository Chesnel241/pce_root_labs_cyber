FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="5.1.3"
LABEL com.pceroot.lab.slug="cloud-soc-05-iam-escalation-logs"

RUN apk add --no-cache jq bash

RUN adduser -D -s /bin/bash analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo 'cat /etc/motd' >> /etc/profile
RUN echo 'cat /etc/motd' >> .bashrc

COPY lab-data/ /home/analyst/logs/
RUN chown -R analyst:analyst /home/analyst

USER analyst
CMD ["/bin/bash", "-l"]
