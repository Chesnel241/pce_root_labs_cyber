FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.3.3" \
      com.pceroot.lab.slug="devsecops-3-3-3-secrets-manager"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY --chown=analyst:analyst lab-data/app.py /home/analyst/app.py
COPY --chown=root:root lab-data/verify.py /usr/local/bin/verify.py
RUN chmod +x /usr/local/bin/verify.py

RUN echo '#!/bin/sh' > /usr/local/bin/verify.sh && \
    echo 'python3 /usr/local/bin/verify.py "$@"' >> /usr/local/bin/verify.sh && \
    chmod +x /usr/local/bin/verify.sh

USER analyst
CMD ["/bin/sh", "-l"]
