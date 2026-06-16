#!/usr/bin/env python3
import sys

def check_pipeline():
    try:
        with open('Jenkinsfile', 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print("[-] Error: Jenkinsfile not found.")
        sys.exit(1)

    errors = []
    
    if "args '-u root'" in content or 'args "-u root"' in content:
        errors.append("Pipeline is still running as root user. (Hint: Remove or change docker args)")
        
    if "AKIAIOSFODNN7EXAMPLE" in content or "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" in content:
        errors.append("Hardcoded AWS credentials found. (Hint: Remove them and use Jenkins credentials integration)")
        
    if "curl -k" in content or "http://" in content:
        errors.append("Insecure download found (curl -k or http://). (Hint: Remove insecure flags and use https)")

    if errors:
        print("[-] Pipeline audit failed. Issues found:")
        for e in errors:
            print("    - " + e)
    else:
        print("[+] Pipeline audit passed! All critical issues fixed.")
        print("[+] Flag: PCE{j3nk1ns_p1p3l1n3_s3cur3d}")

if __name__ == "__main__":
    check_pipeline()
