#!/usr/bin/env python3
import sys
import json
import os
import argparse

STATE_FILE = "/home/analyst/.aws_state.json"
FLAG = "PCE{iam_attach_policy_privesc_2024}"

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {"user": "analyst", "policies": []}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def main():
    if len(sys.argv) < 2:
        print("usage: aws <command> <subcommand> [parameters]")
        sys.exit(1)
    
    service = sys.argv[1]
    
    if len(sys.argv) < 3:
        print(f"usage: aws {service} <subcommand> [parameters]")
        sys.exit(1)
        
    subcommand = sys.argv[2]
    
    state = load_state()
    is_admin = "arn:aws:iam::aws:policy/AdministratorAccess" in state["policies"]

    if service == "sts" and subcommand == "get-caller-identity":
        print(json.dumps({
            "UserId": "AIDAJQABLZS4A3QDU576Q",
            "Account": "123456789012",
            "Arn": "arn:aws:iam::123456789012:user/analyst"
        }, indent=4))
        return

    elif service == "iam" and subcommand == "attach-user-policy":
        parser = argparse.ArgumentParser()
        parser.add_argument("--user-name", required=True)
        parser.add_argument("--policy-arn", required=True)
        args, _ = parser.parse_known_args(sys.argv[3:])
        
        if args.user_name != "analyst":
            print(f"An error occurred (AccessDenied) when calling the AttachUserPolicy operation: User: arn:aws:iam::123456789012:user/analyst is not authorized to perform: iam:AttachUserPolicy on resource: user {args.user_name}")
            sys.exit(1)
            
        if args.policy_arn not in state["policies"]:
            state["policies"].append(args.policy_arn)
            save_state(state)
        return

    elif service == "secretsmanager" and subcommand == "get-secret-value":
        parser = argparse.ArgumentParser()
        parser.add_argument("--secret-id", required=True)
        args, _ = parser.parse_known_args(sys.argv[3:])
        
        if args.secret_id == "flag":
            if is_admin:
                print(json.dumps({
                    "ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:flag-123456",
                    "Name": "flag",
                    "SecretString": FLAG
                }, indent=4))
            else:
                print("An error occurred (AccessDeniedException) when calling the GetSecretValue operation: User: arn:aws:iam::123456789012:user/analyst is not authorized to perform: secretsmanager:GetSecretValue on resource: flag")
                sys.exit(1)
        else:
            print("ResourceNotFoundException")
            sys.exit(1)

    else:
        print(f"Mock AWS CLI does not support {service} {subcommand}")
        sys.exit(1)

if __name__ == "__main__":
    main()
