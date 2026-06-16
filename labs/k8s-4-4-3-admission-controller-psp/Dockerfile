FROM python:3.12-alpine
LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="4.4.3"
LABEL com.pceroot.lab.slug="k8s-4-4-3-admission-controller-psp"

RUN apk add --no-cache nano vim && pip install pyyaml

RUN adduser -D -s /bin/sh analyst
COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile

COPY kubectl-mock.py /usr/local/bin/kubectl
RUN chmod +x /usr/local/bin/kubectl

WORKDIR /home/analyst
USER analyst

CMD ["/bin/sh", "-l"]
