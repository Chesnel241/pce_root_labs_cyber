FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="1.1.2" \
      com.pceroot.lab.slug="cloud-enum-aws-unauth"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY aws_mock.py /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

RUN echo "cat /etc/motd" >> /etc/profile

USER analyst
CMD ["/bin/sh", "-l"]
