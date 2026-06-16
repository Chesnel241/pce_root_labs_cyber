FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="3.2.2"
LABEL com.pceroot.lab.slug="devsecops-3-2-2-audit-cloudformation"

RUN apk add --no-cache bash \
    && pip install --no-cache-dir checkov pyyaml

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY template.yaml .
COPY verify.py .

RUN chown analyst:analyst template.yaml verify.py \
    && chmod +x verify.py \
    && echo "cat /etc/motd" >> /home/analyst/.profile

USER analyst
CMD ["/bin/sh", "-l"]
