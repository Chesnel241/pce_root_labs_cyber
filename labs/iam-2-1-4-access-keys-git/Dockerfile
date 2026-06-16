FROM ubuntu:22.04

# Labels
LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.1.4" \
      com.pceroot.lab.slug="iam-2-1-4-access-keys-git"

# Install requirements
RUN apt-get update && apt-get install -y python3 git && rm -rf /var/lib/apt/lists/*

# Add analyst user
RUN useradd -m -s /bin/bash analyst

# Setup challenge files
COPY motd.txt /etc/motd
COPY verify-keys.py /usr/local/bin/verify-keys
RUN chmod +x /usr/local/bin/verify-keys

# Setup MOTD for shell login
RUN echo "cat /etc/motd" >> /etc/profile && \
    echo "cat /etc/motd" >> /etc/bash.bashrc

# Setup project git repository as analyst
USER analyst
WORKDIR /home/analyst/project

RUN git init && \
    git config --global user.email "dev@pceroot.local" && \
    git config --global user.name "Dev" && \
    echo "# Internal Project" > README.md && \
    git add README.md && \
    git commit -m "Initial commit" && \
    echo "AWS_ACCESS_KEY_ID=AKIA1234567890EXAMPLE" > config.env && \
    echo "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" >> config.env && \
    git add config.env && \
    git commit -m "Add AWS config for local testing" && \
    echo "AWS credentials removed for security." > config.env && \
    git add config.env && \
    git commit -m "Remove exposed AWS credentials"

WORKDIR /home/analyst

CMD ["/bin/sh", "-l"]
