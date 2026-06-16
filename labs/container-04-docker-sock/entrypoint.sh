#!/bin/bash
# Start the mock docker socket server in the background
python3 /usr/local/bin/mock_socket.py &
# Wait a moment for the socket to be created
sleep 1
# Drop into an interactive shell
exec /bin/bash -l
