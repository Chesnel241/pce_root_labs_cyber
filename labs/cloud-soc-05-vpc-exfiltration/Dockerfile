FROM ubuntu:22.04

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.1.2" \
      com.pceroot.lab.slug="cloud-soc-05-vpc-exfiltration"

RUN apt-get update && \
    apt-get install -y python3 jq awk nano vim bsdmainutils && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash analyst

WORKDIR /home/analyst

COPY motd.txt /etc/motd
COPY generate_logs.py /tmp/generate_logs.py

RUN python3 /tmp/generate_logs.py && \
    rm /tmp/generate_logs.py && \
    chown analyst:analyst vpc-flow-logs.txt && \
    chmod 644 vpc-flow-logs.txt

RUN echo "cat /etc/motd" >> /home/analyst/.bashrc

USER analyst
CMD ["/bin/bash", "-l"]
