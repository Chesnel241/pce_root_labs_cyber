FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.1.2" \
      com.pceroot.lab.slug="iam-2-1-2-dormant-keys"

RUN adduser -D -s /bin/sh analyst

COPY motd.txt /etc/motd
COPY lab-data/ /home/analyst/
RUN echo "cat /etc/motd" >> /etc/profile

RUN chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst

CMD ["/bin/sh", "-l"]
