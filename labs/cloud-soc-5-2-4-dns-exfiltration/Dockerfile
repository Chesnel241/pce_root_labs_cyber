FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="5.2.4"
LABEL com.pceroot.lab.slug="cloud-soc-5-2-4-dns-exfiltration"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY dns.log /home/analyst/dns.log

RUN chown analyst:analyst /home/analyst/dns.log && \
    chmod 644 /home/analyst/dns.log

RUN echo "cat /etc/motd" >> /etc/profile

USER analyst

CMD ["/bin/sh", "-l"]
