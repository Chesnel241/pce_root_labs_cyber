#!/usr/bin/env python3
import sys
import os
import json

def main():
    if len(sys.argv) < 2:
        print("usage: aws [options] <command> <subcommand> [<subcommand> ...] [parameters]")
        return

    # Check for AWS_ACCESS_KEY_ID to determine identity
    access_key = os.environ.get('AWS_ACCESS_KEY_ID', 'AKIA_INITIAL_USER')
    
    # Simple argument parsing
    args = sys.argv[1:]
    # Remove options like --region, --no-cli-pager
    parsed_args = [arg for arg in args if not arg.startswith('-')]
    
    if len(parsed_args) < 2:
        print("usage: aws [options] <command> <subcommand> [<subcommand> ...] [parameters]")
        return

    cmd = parsed_args[0]
    subcmd = parsed_args[1]

    if cmd == "sts" and subcmd == "get-caller-identity":
        if access_key == 'AKIA_INITIAL_USER':
            print(json.dumps({
                "UserId": "AIDA_INITIAL_USER",
                "Account": "123456789012",
                "Arn": "arn:aws:iam::123456789012:user/dev-user"
            }, indent=4))
        elif access_key == 'AKIA_ADMIN_ROLE':
            print(json.dumps({
                "UserId": "AROA_ADMIN_ROLE:session",
                "Account": "123456789012",
                "Arn": "arn:aws:sts::123456789012:assumed-role/admin-role/session"
            }, indent=4))
        else:
            print(json.dumps({"Error": "Invalid credentials"}, indent=4))

    elif cmd == "sts" and subcmd == "assume-role":
        if '--role-arn' in args:
            idx = args.index('--role-arn')
            role_arn = args[idx+1]
            if role_arn == "arn:aws:iam::123456789012:role/admin-role":
                if access_key == 'AKIA_INITIAL_USER':
                    print(json.dumps({
                        "Credentials": {
                            "AccessKeyId": "AKIA_ADMIN_ROLE",
                            "SecretAccessKey": "SECRET_ADMIN_ROLE",
                            "SessionToken": "TOKEN_ADMIN_ROLE",
                            "Expiration": "2026-06-16T20:00:00Z"
                        },
                        "AssumedRoleUser": {
                            "AssumedRoleId": "AROA_ADMIN_ROLE:session",
                            "Arn": "arn:aws:sts::123456789012:assumed-role/admin-role/session"
                        }
                    }, indent=4))
                else:
                    print("An error occurred (AccessDenied) when calling the AssumeRole operation: Access Denied")
            else:
                print("An error occurred (AccessDenied) when calling the AssumeRole operation: Role not found or not assumable.")
        else:
            print("Missing --role-arn parameter")

    elif cmd == "s3" and subcmd == "ls":
        if access_key == 'AKIA_ADMIN_ROLE':
            if len(parsed_args) > 2 and parsed_args[2] == "s3://secret-bucket":
                print("2026-06-16 12:00:00         42 flag.txt")
            else:
                print("2026-06-16 12:00:00 secret-bucket")
        else:
            print("An error occurred (AccessDenied) when calling the ListBuckets operation: Access Denied")

    elif cmd == "s3" and subcmd == "cp":
        if access_key == 'AKIA_ADMIN_ROLE':
            if len(parsed_args) > 3 and parsed_args[2] == "s3://secret-bucket/flag.txt":
                dest = parsed_args[3]
                if dest == '.':
                    dest = 'flag.txt'
                elif os.path.isdir(dest):
                    dest = os.path.join(dest, 'flag.txt')
                print(f"download: s3://secret-bucket/flag.txt to {dest}")
                with open(dest, 'w') as f:
                    f.write("PCE{assume_role_pivot_2024}\n")
            else:
                print("fatal error: An error occurred (404) when calling the HeadObject operation: Key Not Found")
        else:
            print("An error occurred (AccessDenied) when calling the GetObject operation: Access Denied")
    
    elif cmd == "iam" and subcmd == "list-roles":
        if access_key == 'AKIA_INITIAL_USER':
            print(json.dumps({
                "Roles": [
                    {
                        "Path": "/",
                        "RoleName": "service-role",
                        "RoleId": "AROA_SERVICE_ROLE",
                        "Arn": "arn:aws:iam::123456789012:role/service-role",
                        "AssumeRolePolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Principal": {
                                        "Service": "ec2.amazonaws.com"
                                    },
                                    "Action": "sts:AssumeRole"
                                }
                            ]
                        }
                    },
                    {
                        "Path": "/",
                        "RoleName": "admin-role",
                        "RoleId": "AROA_ADMIN_ROLE",
                        "Arn": "arn:aws:iam::123456789012:role/admin-role",
                        "AssumeRolePolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Principal": {
                                        "AWS": "arn:aws:iam::123456789012:user/dev-user"
                                    },
                                    "Action": "sts:AssumeRole"
                                }
                            ]
                        }
                    }
                ]
            }, indent=4))
        else:
            print("An error occurred (AccessDenied) when calling the ListRoles operation: Access Denied")
            
    else:
        print(f"Mock AWS CLI doesn't support this operation yet: {cmd} {subcmd}")

if __name__ == '__main__':
    main()
