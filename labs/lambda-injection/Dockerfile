FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="1.3.3" \
      com.pceroot.lab.slug="lambda-injection"

RUN apk add --no-cache bash sudo su-exec

RUN adduser -D analyst && adduser -D lambda_user

WORKDIR /home/analyst

COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /etc/profile && \
    echo "alias aws='python3 /home/analyst/aws_mock.py'" >> /etc/profile

COPY server.py /home/lambda_user/server.py
COPY flag.txt /home/lambda_user/flag.txt
RUN chown -R lambda_user:lambda_user /home/lambda_user && \
    chmod 400 /home/lambda_user/flag.txt

COPY aws_mock.py /home/analyst/aws_mock.py
RUN chown -R analyst:analyst /home/analyst

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
