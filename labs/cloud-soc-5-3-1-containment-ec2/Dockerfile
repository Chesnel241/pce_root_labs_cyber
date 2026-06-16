FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.3.1" \
      com.pceroot.lab.slug="cloud-soc-5-3-1-containment-ec2"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.profile

COPY aws_mock.py /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

USER analyst
CMD ["/bin/sh", "-l"]
