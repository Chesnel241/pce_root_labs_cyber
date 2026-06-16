FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.1.1" \
      com.pceroot.lab.slug="iam-2-1-1-no-mfa"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY aws_mock.py /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

RUN echo "cat /etc/motd" >> /home/analyst/.profile

USER analyst
CMD ["/bin/sh", "-l"]
