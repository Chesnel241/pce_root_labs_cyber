FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="4.3.3"
LABEL com.pceroot.lab.slug="k8s-dns-rebinding"

RUN apk add --no-cache bash sudo curl bind-tools procps shadow \
    && pip install flask dnspython dnslib \
    && adduser -D -s /bin/bash analyst \
    && echo "analyst ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

WORKDIR /home/analyst
COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.bashrc

COPY --chown=analyst:analyst lab-data/ /home/analyst/
RUN chmod +x /home/analyst/start.sh /home/analyst/ssrf_tool.py /home/analyst/dns_server_skeleton.py

USER analyst
CMD ["/bin/bash", "-c", "/home/analyst/start.sh && /bin/bash -l"]
