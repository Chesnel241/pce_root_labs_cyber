#!/usr/bin/env python3
import sys
import os
import argparse

def main():
    parser = argparse.ArgumentParser(description="Mock nsenter for simulation.")
    parser.add_argument('-t', '--target', help='Target process to get contexts from')
    parser.add_argument('-m', '--mount', action='store_true', help='Enter mount namespace')
    parser.add_argument('-u', '--uts', action='store_true', help='Enter UTS namespace')
    parser.add_argument('-i', '--ipc', action='store_true', help='Enter IPC namespace')
    parser.add_argument('-n', '--net', action='store_true', help='Enter network namespace')
    parser.add_argument('-p', '--pid', action='store_true', help='Enter PID namespace')
    
    # Use parse_known_args to capture the command to run (e.g., bash, sh)
    args, unknown = parser.parse_known_args()

    if args.target == '1' and args.mount:
        print("Entering host mount namespace...")
        # Drop into the mock host filesystem
        os.chdir('/.host_fs')
        cmd = "bash"
        if unknown:
            cmd = " ".join(unknown)
        
        # We need to simulate the host environment
        os.system(f"HOME=/.host_fs/root PS1='root@k8s-node-1:~# ' {cmd}")
    else:
        print("nsenter: cannot enter namespace: Operation not permitted")
        print("(Simulated environment: Try targeting PID 1 and entering its mount namespace)")

if __name__ == '__main__':
    main()
