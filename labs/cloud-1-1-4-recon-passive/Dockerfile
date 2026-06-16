FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="1.1.4" \
      com.pceroot.lab.slug="cloud-1-1-4-recon-passive"

RUN adduser -D -s /bin/sh analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.profile

COPY recon_tool /usr/local/bin/recon_tool
COPY s3_client /usr/local/bin/s3_client
RUN chmod +x /usr/local/bin/recon_tool /usr/local/bin/s3_client

WORKDIR /home/analyst
RUN chown -R analyst:analyst /home/analyst

USER analyst

CMD ["/bin/sh", "-l"]
