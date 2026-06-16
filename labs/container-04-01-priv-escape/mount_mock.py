#!/usr/bin/env python3
import sys
import os

args = sys.argv[1:]

if len(args) == 0:
    print("sysfs on /sys type sysfs (rw,nosuid,nodev,noexec,relatime)")
    print("proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)")
    print("udev on /dev type devtmpfs (rw,nosuid,relatime,size=16304560k,nr_inodes=4076140,mode=755)")
    sys.exit(0)

if "/dev/sda1" in args:
    target = args[-1]
    if os.path.isdir(target):
        # Must be root
        if os.geteuid() != 0:
            print("mount: only root can use \"--options\" option")
            sys.exit(32)
        
        # copy mock host filesystem
        os.system(f"cp -a /mock_host/. {target}/ 2>/dev/null")
        sys.exit(0)
    else:
        print(f"mount: {target}: mount point does not exist.")
        sys.exit(32)
else:
    if os.geteuid() != 0:
        print("mount: only root can use \"--options\" option")
        sys.exit(32)
    # fake normal mount
    print(f"mount: unknown filesystem type or bad option")
    sys.exit(32)
