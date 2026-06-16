FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="1.4.2"
LABEL com.pceroot.lab.slug="cloud-1-4-2-imdsv2-bypass"

RUN pip install flask requests

COPY imds_mock.py /opt/imds_mock.py
COPY app.py /opt/app.py
COPY motd.txt /etc/motd
COPY profile /tmp/.profile

RUN adduser -D -s /bin/sh analyst && \
    mv /tmp/.profile /home/analyst/.profile && \
    chown analyst:analyst /home/analyst/.profile

USER analyst
WORKDIR /home/analyst

CMD ["/bin/sh", "-l"]
