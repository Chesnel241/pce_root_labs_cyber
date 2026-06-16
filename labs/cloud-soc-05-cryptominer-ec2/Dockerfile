FROM ubuntu:22.04

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="5.2.3"
LABEL com.pceroot.lab.slug="cloud-soc-05-cryptominer-ec2"

RUN apt-get update && apt-get install -y sudo curl jq nano && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash analyst
RUN echo "analyst ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

COPY motd.txt /etc/motd
RUN echo 'cat /etc/motd' >> /home/analyst/.bashrc

# Simulate the compromised state
RUN mkdir -p /var/tmp/.crypto
COPY config.json /var/tmp/.crypto/config.json
COPY fake_xmrig /var/tmp/.crypto/xmrig
RUN chmod +x /var/tmp/.crypto/xmrig

# Add cronjob for persistence
RUN echo "*/5 * * * * root /var/tmp/.crypto/xmrig -c /var/tmp/.crypto/config.json > /dev/null 2>&1" > /etc/cron.d/update_system

# Fake bash history for root
COPY root_bash_history /root/.bash_history
RUN chmod 600 /root/.bash_history

USER analyst
WORKDIR /home/analyst

CMD ["/bin/bash", "-l"]
