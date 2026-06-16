FROM ubuntu:22.04

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="6.1.3"
LABEL com.pceroot.lab.slug="bastion-host-vpn"

RUN apt-get update && apt-get install -y python3 nano && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash analyst

COPY motd.txt /etc/motd
COPY lab-data /home/analyst/lab-data

RUN echo "cat /etc/motd" >> /etc/bash.bashrc

RUN chown -R analyst:analyst /home/analyst/lab-data && chmod +x /home/analyst/lab-data/*.py

USER analyst
WORKDIR /home/analyst/lab-data

CMD ["/bin/bash", "-l"]
