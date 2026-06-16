#!/usr/bin/env python3
import sys
import json
import argparse

def main():
    args = sys.argv[1:]
    
    if len(args) < 2 or args[0] != "iam":
        print("usage: aws iam <command> [options]")
        sys.exit(1)
        
    command = args[1]
    
    users = {
        "admin_alice": {
            "mfa": True,
            "tags": []
        },
        "dev_bob": {
            "mfa": True,
            "tags": []
        },
        "intern_charlie": {
            "mfa": False,
            "tags": [{"Key": "flag", "Value": "PCE{iam_no_mfa_found_2024}"}]
        }
    }

    if command == "list-users":
        print(json.dumps({
            "Users": [
                {"UserName": "admin_alice", "Arn": "arn:aws:iam::123456789012:user/admin_alice"},
                {"UserName": "dev_bob", "Arn": "arn:aws:iam::123456789012:user/dev_bob"},
                {"UserName": "intern_charlie", "Arn": "arn:aws:iam::123456789012:user/intern_charlie"}
            ]
        }, indent=4))
    
    elif command == "list-mfa-devices":
        if "--user-name" not in args:
            print("Error: missing --user-name parameter")
            sys.exit(1)
        idx = args.index("--user-name")
        username = args[idx+1]
        
        if username not in users:
            print(f"User {username} not found")
            sys.exit(1)
            
        if users[username]["mfa"]:
            print(json.dumps({
                "MFADevices": [
                    {
                        "UserName": username,
                        "SerialNumber": f"arn:aws:iam::123456789012:mfa/{username}",
                        "EnableDate": "2024-01-01T12:00:00Z"
                    }
                ]
            }, indent=4))
        else:
            print(json.dumps({
                "MFADevices": []
            }, indent=4))
            
    elif command == "get-user":
        if "--user-name" not in args:
            print("Error: missing --user-name parameter")
            sys.exit(1)
        idx = args.index("--user-name")
        username = args[idx+1]
        
        if username not in users:
            print(f"User {username} not found")
            sys.exit(1)
            
        print(json.dumps({
            "User": {
                "UserName": username,
                "Arn": f"arn:aws:iam::123456789012:user/{username}",
                "Tags": users[username]["tags"]
            }
        }, indent=4))
    else:
        print(f"Invalid command: {command}")
        print("Available commands: list-users, list-mfa-devices, get-user")
        sys.exit(1)

if __name__ == "__main__":
    main()
