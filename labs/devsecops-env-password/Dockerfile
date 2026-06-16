FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.3.2" \
      com.pceroot.lab.slug="devsecops-env-password"

RUN adduser -D -s /bin/sh analyst

# In a real scenario, this would be injected by Kubernetes or Docker Compose.
# Here we simulate the bad practice by setting it in the Dockerfile.
ENV DB_PASSWORD="PCE{env_v4r_s3cr3t_2026}"

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

WORKDIR /opt/app
COPY app.py .
RUN chown -R analyst:analyst /opt/app

USER analyst

# The user drops into a shell. If they run `env` or `printenv`, they see the flag.
CMD ["/bin/sh", "-l"]
