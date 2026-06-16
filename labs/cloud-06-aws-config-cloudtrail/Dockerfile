FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="6.3.3"
LABEL com.pceroot.lab.slug="cloud-06-aws-config-cloudtrail"

RUN adduser -D -s /bin/sh analyst && \
    apk add --no-cache jq

WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY lab-data/ /home/analyst/lab-data/

RUN chown -R analyst:analyst /home/analyst/lab-data/ && \
    echo "cat /etc/motd" >> /etc/profile

USER analyst
CMD ["/bin/sh", "-l"]
