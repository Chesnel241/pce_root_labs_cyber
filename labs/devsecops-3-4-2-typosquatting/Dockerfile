FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.4.2" \
      com.pceroot.lab.slug="devsecops-3-4-2-typosquatting"

RUN adduser -D -s /bin/sh analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY lab-data /home/analyst/app

RUN chown -R analyst:analyst /home/analyst/app

RUN mkdir -p /home/analyst/app/.venv/lib/python3.12/site-packages/Flask \
    /home/analyst/app/.venv/lib/python3.12/site-packages/requests \
    /home/analyst/app/.venv/lib/python3.12/site-packages/urllib3 \
    /home/analyst/app/.venv/lib/python3.12/site-packages/cryptography \
    /home/analyst/app/.venv/lib/python3.12/site-packages/werkzeug \
    /home/analyst/app/.venv/lib/python3.12/site-packages/pip \
    /home/analyst/app/.venv/lib/python3.12/site-packages/setuptools

USER analyst
WORKDIR /home/analyst/app

CMD ["/bin/sh", "-l"]
