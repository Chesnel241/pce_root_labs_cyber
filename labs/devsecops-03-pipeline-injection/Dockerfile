FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.1.2" \
      com.pceroot.lab.slug="devsecops-03-pipeline-injection"

RUN apk add --no-cache sudo bash py3-yaml

RUN adduser -D analyst && \
    adduser -D ci-runner

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY lab-data/ /opt/ci/
RUN chown -R ci-runner:ci-runner /opt/ci/ && \
    chmod 700 /opt/ci/flag.txt && \
    chmod 755 /opt/ci/run-pipeline.py

RUN echo "analyst ALL=(ci-runner) NOPASSWD: /opt/ci/run-pipeline.py" >> /etc/sudoers

WORKDIR /home/analyst
USER analyst

CMD ["/bin/sh", "-l"]
