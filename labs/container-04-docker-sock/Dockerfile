FROM ubuntu:22.04

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="4.1.2"
LABEL com.pceroot.lab.slug="container-04-docker-sock"

RUN apt-get update && \
    apt-get install -y curl python3 socat && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/bash analyst

# Set up motd
COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/bash.bashrc

# Copy mock docker CLI
COPY mock_docker.sh /usr/local/bin/docker
RUN chmod +x /usr/local/bin/docker

# Copy mock docker socket script
COPY mock_socket.py /usr/local/bin/mock_socket.py
RUN chmod +x /usr/local/bin/mock_socket.py

# Ensure /var/run exists and is writable so our user can create the docker socket
RUN mkdir -p /run /var/run && chmod 777 /run /var/run

# Create a startup script that runs the mock socket and then drops to shell
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER analyst
WORKDIR /home/analyst

CMD ["/entrypoint.sh"]
