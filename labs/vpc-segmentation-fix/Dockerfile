FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="6.1.1" \
      com.pceroot.lab.slug="vpc-segmentation-fix"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY vpc_config.json .
COPY validate.py .

RUN chown analyst:analyst vpc_config.json \
    && chmod 644 vpc_config.json \
    && chown root:root validate.py \
    && chmod 755 validate.py \
    && echo "cat /etc/motd" >> /home/analyst/.profile

USER analyst
CMD ["/bin/sh", "-l"]
