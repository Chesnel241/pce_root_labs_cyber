#!/usr/bin/env python3
import sys
import os

args = sys.argv[1:]

if len(args) == 0:
    print("sysfs on /sys type sysfs (rw,nosuid,nodev,noexec,relatime)")
    print("proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)")
    print("udev on /dev type devtmpfs (rw,nosuid,relatime,size=800000k,nr_inodes=200000,mode=755)")
    sys.exit(0)

if "/dev/sda1" in args:
    dest = args[-1]
    if dest.startswith("-"):
        print("mount: bad usage")
        sys.exit(1)
    
    if not os.path.exists(dest):
        print(f"mount: mount point {dest} does not exist")
        sys.exit(1)
        
    print(f"Mounting /dev/sda1 to {dest}...")
    flag = "PCE{sys_admin_c4p_m0unt_2024}"
    
    try:
        with open(os.path.join(dest, "root_flag.txt"), "w") as f:
            f.write(f"Congrats! You successfully exploited CAP_SYS_ADMIN to mount the host filesystem.\nHere is your flag: {flag}\n")
        print(f"Successfully mounted /dev/sda1 on {dest}")
        print(f"You can now read {os.path.join(dest, 'root_flag.txt')}")
    except Exception as e:
        print(f"mount: {e}")
    sys.exit(0)

print("mount: permission denied or invalid device.")
sys.exit(1)
