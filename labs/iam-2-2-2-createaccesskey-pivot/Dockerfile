FROM python:3.12-alpine
LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.2.2" \
      com.pceroot.lab.slug="iam-2-2-2-createaccesskey-pivot"

RUN adduser -D analyst
COPY motd.txt /etc/motd
COPY mock_aws.py /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

USER analyst
WORKDIR /home/analyst
RUN echo "cat /etc/motd" >> ~/.profile
ENV ENV="/home/analyst/.profile"

CMD ["/bin/sh", "-l"]
