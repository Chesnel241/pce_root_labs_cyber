FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="6.3.2" \
      com.pceroot.lab.slug="cloud-6-3-2-findings-security-hub"

RUN apk add --no-cache bash jq

RUN adduser -D -s /bin/bash analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.bashrc

COPY mock-aws /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

USER analyst
CMD ["/bin/bash", "-l"]
