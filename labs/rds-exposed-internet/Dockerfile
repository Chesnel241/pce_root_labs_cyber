FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="1.2.3"
LABEL com.pceroot.lab.slug="rds-exposed-internet"

RUN apk add --no-cache bash && \
    adduser -D -s /bin/bash analyst

COPY challenge.json /challenge.json
COPY motd.txt /etc/motd

COPY mock_aws.py /usr/local/bin/aws
COPY mock_mysql.py /usr/local/bin/mysql
RUN chmod +x /usr/local/bin/aws /usr/local/bin/mysql

COPY app_config.yml /home/analyst/app_config.yml
RUN chown analyst:analyst /home/analyst/app_config.yml

RUN echo "cat /etc/motd" >> /home/analyst/.bashrc && \
    echo "cat /etc/motd" >> /home/analyst/.profile

USER analyst
WORKDIR /home/analyst

CMD ["/bin/bash", "-l"]
