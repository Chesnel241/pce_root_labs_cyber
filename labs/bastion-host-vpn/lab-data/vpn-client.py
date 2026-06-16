#!/usr/bin/env python3
import sys
import os
import time

STATE_FILE = "/tmp/.vpn_connected"

def main():
    if len(sys.argv) < 2:
        print("Usage: ./vpn-client.py [connect|disconnect|status]")
        sys.exit(1)

    action = sys.argv[1].lower()

    if action == "connect":
        print("Initializing VPN connection...")
        time.sleep(1)
        print("Authenticating...")
        time.sleep(1)
        with open(STATE_FILE, "w") as f:
            f.write("connected")
        print("VPN Connected successfully. Your mock IP is 10.8.0.5.")
    elif action == "disconnect":
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)
            print("VPN Disconnected.")
        else:
            print("VPN is not connected.")
    elif action == "status":
        if os.path.exists(STATE_FILE):
            print("VPN is CONNECTED (IP: 10.8.0.5)")
        else:
            print("VPN is DISCONNECTED")
    else:
        print("Unknown action.")

if __name__ == "__main__":
    main()
