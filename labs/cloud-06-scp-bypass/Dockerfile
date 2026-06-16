FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="6.2.3"
LABEL com.pceroot.lab.slug="cloud-06-scp-bypass"

RUN adduser -D analyst
COPY lab-data/aws.py /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

USER analyst
WORKDIR /home/analyst

CMD ["/bin/sh", "-l"]
