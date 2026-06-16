#!/usr/bin/env python3
import sys

if len(sys.argv) > 1 and sys.argv[1] == "--print":
    print("Current: = cap_chown,cap_dac_override,cap_fowner,cap_fsetid,cap_kill,cap_setgid,cap_setuid,cap_setpcap,cap_net_bind_service,cap_net_raw,cap_sys_chroot,cap_mknod,cap_audit_write,cap_setfcap,cap_sys_admin+eip")
    print("Bounding set =cap_chown,cap_dac_override,cap_fowner,cap_fsetid,cap_kill,cap_setgid,cap_setuid,cap_setpcap,cap_net_bind_service,cap_net_raw,cap_sys_chroot,cap_mknod,cap_audit_write,cap_setfcap,cap_sys_admin")
    print("Ambient set =")
    print("Securebits: 00/0x0/1'b0")
    print(" secure-noroot: no (unlocked)")
    print(" secure-no-suid-fixup: no (unlocked)")
    print(" secure-keep-caps: no (unlocked)")
    print(" secure-no-ambient-raise: no (unlocked)")
    print("uid=1000(analyst) euid=1000(analyst)")
    print("gid=1000(analyst)")
    print("groups=1000(analyst)")
else:
    print("usage: capsh [--print]")
