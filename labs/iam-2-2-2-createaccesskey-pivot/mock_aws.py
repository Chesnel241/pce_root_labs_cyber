#!/usr/bin/env python3
import sys
import argparse

def main():
    if len(sys.argv) < 2:
        print("usage: aws <command> <subcommand> [parameters]")
        return

    command = sys.argv[1]
    
    if command == "iam":
        if len(sys.argv) < 3:
            print("usage: aws iam <subcommand> [parameters]")
            return
        subcommand = sys.argv[2]
        
        if subcommand == "create-access-key":
            parser = argparse.ArgumentParser()
            parser.add_argument("--user-name", required=True)
            args, _ = parser.parse_known_args(sys.argv[3:])
            
            if args.user_name == "admin_user":
                print('{\n    "AccessKey": {\n        "UserName": "admin_user",\n        "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",\n        "Status": "Active",\n        "SecretAccessKey": "PCE{iam_pivot_key_2026}",\n        "CreateDate": "2026-06-16T17:51:29Z"\n    }\n}')
            else:
                print(f'An error occurred (AccessDenied) when calling the CreateAccessKey operation: User: arn:aws:iam::123456789012:user/compromised_dev is not authorized to perform: iam:CreateAccessKey on resource: user {args.user_name}')
        elif subcommand == "list-users":
            print('{\n    "Users": [\n        {\n            "Path": "/",\n            "UserName": "admin_user",\n            "UserId": "AIDA9876543210EXAMPLE",\n            "Arn": "arn:aws:iam::123456789012:user/admin_user"\n        },\n        {\n            "Path": "/",\n            "UserName": "compromised_dev",\n            "UserId": "AIDA1234567890EXAMPLE",\n            "Arn": "arn:aws:iam::123456789012:user/compromised_dev"\n        }\n    ]\n}')
        else:
            print(f"Unknown subcommand: {subcommand}")
    elif command == "sts" and len(sys.argv) > 2 and sys.argv[2] == "get-caller-identity":
        print('{\n    "UserId": "AIDA1234567890EXAMPLE",\n    "Account": "123456789012",\n    "Arn": "arn:aws:iam::123456789012:user/compromised_dev"\n}')
    else:
        print(f"usage: aws <command> <subcommand> [parameters]")

if __name__ == "__main__":
    main()
