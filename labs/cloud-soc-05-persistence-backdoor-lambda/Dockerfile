FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.2.2" \
      com.pceroot.lab.slug="cloud-soc-05-persistence-backdoor-lambda"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY lab-data/lambdas /home/analyst/lambdas
RUN chown -R analyst:analyst /home/analyst/lambdas

USER analyst
CMD ["/bin/sh", "-l"]
