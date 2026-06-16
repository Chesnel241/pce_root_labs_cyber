FROM python:3.12-alpine
LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="6.1.4" \
      com.pceroot.lab.slug="cloud-6-1-4-waf"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY lab-data/ /home/analyst/

RUN chown -R analyst:analyst /home/analyst && \
    chmod 755 /home/analyst/test_waf.py && \
    echo 'cat /etc/motd' >> /home/analyst/.profile

USER analyst
CMD ["/bin/sh", "-l"]
