#!/bin/sh
# Start the mock API server in the background
python3 /opt/api_server.py &
# Wait a moment for it to start
sleep 1
# Execute the main command
exec "$@"
