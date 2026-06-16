FROM alpine:3.19

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.1.3" \
      com.pceroot.lab.slug="devsecops-03-actions-secrets-logs"

# Install basics
RUN apk add --no-cache bash grep less jq git

# Create analyst user
RUN adduser -D -s /bin/bash analyst

WORKDIR /home/analyst

# Copy lab files
COPY motd.txt /etc/motd
COPY lab-data/ /home/analyst/lab-data/

# Setup bashrc to show motd
RUN echo 'cat /etc/motd' >> /home/analyst/.bashrc && \
    chown -R analyst:analyst /home/analyst

USER analyst
CMD ["/bin/bash", "-l"]
