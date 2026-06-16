#!/usr/bin/env python3
import sys
import os

if os.geteuid() != 0:
    print("fdisk: cannot open /dev/sda: Permission denied")
    sys.exit(1)

args = sys.argv[1:]
if "-l" in args or len(args) == 0:
    print("""Disk /dev/sda: 50 GiB, 53687091200 bytes, 104857600 sectors
Disk model: Virtual disk
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x00000000

Device     Boot Start       End   Sectors Size Id Type
/dev/sda1  *     2048 104857599 104855552  50G 83 Linux
""")
    sys.exit(0)
print("fdisk: invalid option")
sys.exit(1)
