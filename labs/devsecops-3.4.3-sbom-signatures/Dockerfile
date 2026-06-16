FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.4.3" \
      com.pceroot.lab.slug="devsecops-3.4.3-sbom-signatures"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY lab-data/ /home/analyst/
COPY mock-bin/ /usr/local/bin/
RUN chmod +x /usr/local/bin/* && \
    chown -R analyst:analyst /home/analyst

USER analyst
CMD ["/bin/sh", "-l"]
