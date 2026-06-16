FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="4.4.2" \
      com.pceroot.lab.slug="container-4-4-2-sys-admin"

RUN adduser -D analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.profile

COPY mock_mount.py /usr/local/bin/mount
COPY mock_lsblk.py /usr/local/bin/lsblk
COPY mock_capsh.py /usr/local/bin/capsh

RUN chmod +x /usr/local/bin/mount /usr/local/bin/lsblk /usr/local/bin/capsh && \
    mkdir -p /dev && \
    touch /dev/sda1 && \
    mkdir -p /mnt && \
    chown analyst:analyst /mnt

USER analyst
CMD ["/bin/sh", "-l"]
