FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="6.2.2" \
      com.pceroot.lab.slug="cloud-06-mtls-microservices"

RUN apk add --no-cache bash curl

# Create user
RUN adduser -D -s /bin/sh analyst

# Set up the challenge
COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY curl-mock.sh /usr/local/bin/curl
RUN chmod +x /usr/local/bin/curl

# Create dummy certs
RUN mkdir -p /etc/microservices/certs
RUN echo "-----BEGIN CERTIFICATE-----" > /etc/microservices/certs/client.crt && \
    echo "MIIB...dummy...cert...MIIB" >> /etc/microservices/certs/client.crt && \
    echo "-----END CERTIFICATE-----" >> /etc/microservices/certs/client.crt

RUN echo "-----BEGIN PRIVATE KEY-----" > /etc/microservices/certs/client.key && \
    echo "MIIB...dummy...key...MIIB" >> /etc/microservices/certs/client.key && \
    echo "-----END PRIVATE KEY-----" >> /etc/microservices/certs/client.key

# Make sure analyst can read them
RUN chown -R root:analyst /etc/microservices/certs && \
    chmod 750 /etc/microservices/certs && \
    chmod 640 /etc/microservices/certs/client.*

USER analyst
WORKDIR /home/analyst

CMD ["/bin/sh", "-l"]
