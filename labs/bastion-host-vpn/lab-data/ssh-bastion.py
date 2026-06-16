#!/usr/bin/env python3
import sys
import os
import time

STATE_FILE = "/tmp/.vpn_connected"

def main():
    print("Connecting to Bastion Host (203.0.113.10)...")
    time.sleep(1)
    
    if not os.path.exists(STATE_FILE):
        print("Connection timed out.")
        print("Error: The bastion host firewall drops all traffic not originating from the corporate VPN.")
        sys.exit(1)
        
    print("Connection established from 10.8.0.5.")
    print("Authenticating as 'admin'...")
    time.sleep(1)
    print("Welcome to the Bastion Host.")
    print("\n[bastion-host]$ Trying to access internal server (10.0.1.50)...")
    time.sleep(1)
    print("[internal-server]$ Access granted.")
    print("\nRetrieving flag...")
    print("PCE{bastion_vpn_secured_2026}")
    print("\nConnection closed.")

if __name__ == "__main__":
    main()
