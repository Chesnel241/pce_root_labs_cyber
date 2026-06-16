FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="1.2.2" \
      com.pceroot.lab.slug="cloud-1.2.2-api-gw-bypass"

RUN apk add --no-cache curl bash

RUN adduser -D -s /bin/bash analyst
WORKDIR /home/analyst

COPY challenge.json /opt/challenge.json
COPY mock_api.py /opt/mock_api.py
COPY motd.txt /etc/motd

RUN echo "python3 /opt/mock_api.py >/dev/null 2>&1 &" >> /home/analyst/.bash_profile && \
    echo "cat /etc/motd" >> /home/analyst/.bash_profile && \
    chown -R analyst:analyst /home/analyst

USER analyst
CMD ["/bin/bash", "-l"]
