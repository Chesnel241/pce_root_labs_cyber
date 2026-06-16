FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.1.4" \
      com.pceroot.lab.slug="cloud-soc-5-1-4-cloudtrail-desactive"

RUN addgroup -S analyst && adduser -S analyst -G analyst -s /bin/sh

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

WORKDIR /home/analyst
COPY lab-data/ /home/analyst/

RUN chown -R analyst:analyst /home/analyst

USER analyst
CMD ["/bin/sh", "-l"]
