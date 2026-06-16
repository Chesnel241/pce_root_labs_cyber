#!/usr/bin/env python3
import sys

def main():
    args = sys.argv[1:]
    if len(args) == 0:
        print("usage: aws [options] <command> <subcommand> [parameters]")
        return
        
    if args[0] == "s3":
        if "--no-sign-request" not in args:
            print("Fatal error (AccessDenied): Access Denied. You must use --no-sign-request if you don't have credentials.")
            return
            
        if "ls" in args:
            bucket_idx = args.index("ls") + 1
            if bucket_idx < len(args):
                bucket = args[bucket_idx]
                if bucket == "s3://pceroot-public-assets" or bucket == "s3://pceroot-public-assets/":
                    print("                           PRE images/")
                    print("2026-06-16 12:00:00         45 index.html")
                    print("2026-06-16 12:05:00         35 secret.txt")
                else:
                    print(f"Fatal error (NoSuchBucket): The specified bucket does not exist or access is denied.")
            else:
                print("usage: aws s3 ls <target>")
        elif "cp" in args:
            cp_idx = args.index("cp") + 1
            if cp_idx + 1 < len(args):
                src = args[cp_idx]
                dest = args[cp_idx+1]
                if src == "s3://pceroot-public-assets/secret.txt":
                    print("download: s3://pceroot-public-assets/secret.txt to ./secret.txt")
                    with open("secret.txt", "w") as f:
                        f.write("PCE{unauth_s3_buck3t_enum_2026}\n")
                else:
                    print("Fatal error (404): Not Found")
            else:
                print("usage: aws s3 cp <src> <dest>")
        else:
            print("usage: aws s3 <command>")
    else:
        print("This lab only supports 's3' commands.")

if __name__ == "__main__":
    main()
