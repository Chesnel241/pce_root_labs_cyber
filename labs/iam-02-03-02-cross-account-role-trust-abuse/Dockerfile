FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.3.2" \
      com.pceroot.lab.slug="iam-02-03-02-cross-account-role-trust-abuse"

RUN apk add --no-cache bash jq curl

# Add mock CLI
COPY aws /usr/local/bin/aws
RUN chmod +x /usr/local/bin/aws

RUN adduser -D analyst
USER analyst
WORKDIR /home/analyst

COPY --chown=analyst:analyst motd.txt /home/analyst/motd.txt
RUN echo 'cat /home/analyst/motd.txt' >> ~/.bash_profile

ENV AWS_ACCESS_KEY_ID=AKIA111122223333XXXX
ENV AWS_SECRET_ACCESS_KEY=MockSecretKeyForAttackerAccount
ENV AWS_DEFAULT_REGION=us-east-1

CMD ["/bin/bash", "-l"]
