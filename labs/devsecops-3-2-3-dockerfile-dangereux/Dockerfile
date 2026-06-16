FROM ubuntu:22.04

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="3.2.3"
LABEL com.pceroot.lab.slug="devsecops-3-2-3-dockerfile-dangereux"

RUN apt-get update && apt-get install -y \
    nano \
    vim \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash analyst

COPY motd.txt /etc/motd
RUN echo 'cat /etc/motd' >> /home/analyst/.bashrc

COPY lab-data/project /home/analyst/project
RUN chown -R analyst:analyst /home/analyst/project

USER analyst
WORKDIR /home/analyst

CMD ["/bin/bash", "-l"]
