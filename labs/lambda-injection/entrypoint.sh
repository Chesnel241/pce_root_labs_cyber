#!/bin/sh
su-exec lambda_user python3 /home/lambda_user/server.py &
sleep 1
su-exec analyst /bin/sh -l
