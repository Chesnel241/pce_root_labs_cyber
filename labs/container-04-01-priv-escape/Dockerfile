FROM ubuntu:22.04

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="4.1.1"
LABEL com.pceroot.lab.slug="container-04-01-priv-escape"

RUN apt-get update && apt-get install -y sudo python3 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash analyst && \
    echo "analyst ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

RUN mkdir -p /mock_host/root && \
    echo "PCE{escap3d_pr1v_c0ntain3r_2026}" > /mock_host/root/flag.txt && \
    chmod 600 /mock_host/root/flag.txt

COPY mount_mock.py /bin/mount
COPY fdisk_mock.py /sbin/fdisk
COPY lsblk_mock.py /bin/lsblk

RUN chmod +x /bin/mount /sbin/fdisk /bin/lsblk

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.bashrc && \
    echo "cat /etc/motd" >> /root/.bashrc

USER analyst
WORKDIR /home/analyst

CMD ["/bin/sh", "-l"]
