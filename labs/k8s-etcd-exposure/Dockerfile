FROM ubuntu:22.04

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="4.2.3" \
      com.pceroot.lab.slug="k8s-etcd-exposure"

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    jq \
    binutils \
    grep \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash analyst

COPY motd.txt /etc/motd
RUN echo 'cat /etc/motd' >> /etc/profile

COPY etcdctl /usr/local/bin/etcdctl
RUN chmod +x /usr/local/bin/etcdctl

# Simulate a mock etcd data directory just in case
RUN mkdir -p /var/lib/etcd/member/snap/ && \
    echo 'SQLite format 3\000... some binary garbage ... /registry/secrets/default/admin-token ... {"token": "PCE{etcd_secrets_unencrypted_2024}"} ... more garbage' > /var/lib/etcd/member/snap/db && \
    chmod 644 /var/lib/etcd/member/snap/db

USER analyst
WORKDIR /home/analyst

CMD ["/bin/bash", "-l"]
