FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.3.3" \
      com.pceroot.lab.slug="cloud-soc-5-3-3-ransomware-cloud"

RUN apk add --no-cache jq bash coreutils

RUN adduser -D -s /bin/bash analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.profile
RUN echo "cat /etc/motd" >> /home/analyst/.bashrc

COPY logs/ /home/analyst/logs/
RUN chown -R analyst:analyst /home/analyst/logs/

USER analyst
CMD ["/bin/bash", "-l"]
