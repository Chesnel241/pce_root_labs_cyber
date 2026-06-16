FROM python:3.12-alpine

LABEL com.pceroot.lab="true"
LABEL com.pceroot.lab.challenge="1.3.2"
LABEL com.pceroot.lab.slug="cloud-1-3-2-assumerole-abuse"

# Create analyst user
RUN adduser -D -s /bin/sh analyst

# Set up mock AWS CLI
COPY aws_mock.py /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

# Setup MOTD and Environment
COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile && \
    echo "export AWS_ACCESS_KEY_ID=AKIA_INITIAL_USER" >> /etc/profile && \
    echo "export AWS_SECRET_ACCESS_KEY=SECRET_INITIAL_USER" >> /etc/profile && \
    echo "export AWS_DEFAULT_REGION=us-east-1" >> /etc/profile

USER analyst
WORKDIR /home/analyst

CMD ["/bin/sh", "-l"]
