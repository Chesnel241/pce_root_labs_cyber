#!/bin/sh
python3 /opt/server.py &
sleep 1
exec /bin/sh -l
