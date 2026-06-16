FROM python:3.12-alpine
LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.2.3" \
      com.pceroot.lab.slug="iam-02-update-assume-role-policy"

RUN apk add --no-cache bash sudo jq

RUN adduser -D -s /bin/bash analyst && \
    echo "analyst:analyst" | chpasswd

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY aws-mock.sh /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

WORKDIR /home/analyst
USER analyst
CMD ["/bin/bash", "-l"]
