FROM ubuntu:22.04

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="4.1.3" \
      com.pceroot.lab.slug="container-k8s-4-1-3-mount-namespace"

# Install necessary packages
RUN apt-get update && \
    apt-get install -y python3 sudo bash && \
    rm -rf /var/lib/apt/lists/*

# Add analyst user
RUN useradd -m -s /bin/bash analyst

# Copy MOTD and set it up to print on login
COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.bash_profile && \
    echo "cat /etc/motd" >> /home/analyst/.profile && \
    chown analyst:analyst /home/analyst/.bash_profile /home/analyst/.profile

# Set up the mock host filesystem and flag
RUN mkdir -p /.host_fs/root && \
    echo "PCE{nsenter_mount_breakout_2024}" > /.host_fs/root/flag.txt && \
    chmod 700 /.host_fs/root && \
    chmod 600 /.host_fs/root/flag.txt

# Copy mock nsenter script
COPY lab-data/nsenter.py /usr/local/bin/nsenter
RUN chmod +x /usr/local/bin/nsenter

# Allow analyst to run nsenter as root without password
RUN echo "analyst ALL=(ALL) NOPASSWD: /usr/local/bin/nsenter" > /etc/sudoers.d/analyst && \
    chmod 0440 /etc/sudoers.d/analyst

# Switch to analyst user
USER analyst
WORKDIR /home/analyst

# Start shell
CMD ["/bin/sh", "-l"]
