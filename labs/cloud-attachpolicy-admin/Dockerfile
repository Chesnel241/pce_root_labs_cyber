FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="1.3.4"
LABEL com.pceroot.lab.slug="cloud-attachpolicy-admin"

RUN adduser -D -s /bin/sh analyst

COPY aws_mock.py /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.profile

USER analyst
WORKDIR /home/analyst

CMD ["/bin/sh", "-l"]
