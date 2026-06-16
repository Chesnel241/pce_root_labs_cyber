FROM ubuntu:22.04

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="3.1.4"
LABEL com.pceroot.lab.slug="devsecops-3-1-4-jenkins-audit"

RUN apt-get update && apt-get install -y python3 nano vim jq && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash analyst
WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/bash.bashrc

COPY --chown=analyst:analyst lab-data/Jenkinsfile /home/analyst/Jenkinsfile
COPY --chown=analyst:analyst lab-data/check_pipeline.py /home/analyst/check_pipeline.py
RUN chmod +x /home/analyst/check_pipeline.py

USER analyst
CMD ["/bin/bash", "-l"]
