FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.3.3" \
      com.pceroot.lab.slug="iam-saml-assertion-manipulation"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY login.py /home/analyst/login.py
COPY token.txt /home/analyst/token.txt

RUN chmod +x /home/analyst/login.py && \
    chown -R root:root /home/analyst && \
    chmod -R 755 /home/analyst && \
    echo 'cat /etc/motd' >> /home/analyst/.profile

USER analyst
CMD ["/bin/sh", "-l"]
