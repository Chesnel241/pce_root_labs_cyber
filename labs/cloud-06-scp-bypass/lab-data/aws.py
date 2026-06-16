#!/usr/bin/env python3
import sys
import argparse
import json

def main():
    if len(sys.argv) < 3:
        print("usage: aws <command> <subcommand> [parameters]")
        sys.exit(1)
        
    command = sys.argv[1]
    subcommand = sys.argv[2]
    
    if command == "organizations":
        if subcommand == "list-policies":
            print(json.dumps({
                "Policies": [
                    {
                        "Id": "p-12345",
                        "Arn": "arn:aws:organizations::123456789012:policy/o-123456/service_control_policy/p-12345",
                        "Name": "RestrictRegion",
                        "Type": "SERVICE_CONTROL_POLICY",
                        "AwsManaged": False
                    }
                ]
            }, indent=4))
        elif subcommand == "describe-policy":
            policy_id = None
            if "--policy-id" in sys.argv:
                idx = sys.argv.index("--policy-id")
                if idx + 1 < len(sys.argv):
                    policy_id = sys.argv[idx+1]
            
            if policy_id == "p-12345":
                print(json.dumps({
                    "Policy": {
                        "PolicySummary": {
                            "Id": "p-12345",
                            "Arn": "arn:aws:organizations::123456789012:policy/o-123456/service_control_policy/p-12345",
                            "Name": "RestrictRegion",
                            "Type": "SERVICE_CONTROL_POLICY",
                            "AwsManaged": False
                        },
                        "Content": json.dumps({
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Sid": "RequireSpecificRegion",
                                    "Effect": "Deny",
                                    "Action": "*",
                                    "Resource": "*",
                                    "Condition": {
                                        "StringNotEquals": {
                                            "aws:RequestedRegion": ["eu-central-1"]
                                        }
                                    }
                                }
                            ]
                        })
                    }
                }, indent=4))
            else:
                print("An error occurred (PolicyNotFoundException) when calling the DescribePolicy operation: Policy not found")
                sys.exit(1)
        else:
            print(f"aws: error: argument subcommand: invalid choice: '{subcommand}'")
            
    elif command == "ec2":
        if subcommand == "run-instances":
            region = "us-east-1" # default
            if "--region" in sys.argv:
                idx = sys.argv.index("--region")
                if idx + 1 < len(sys.argv):
                    region = sys.argv[idx+1]
            
            if region != "eu-central-1":
                print("\nAn error occurred (AccessDenied) when calling the RunInstances operation: User: arn:aws:iam::123456789012:user/analyst is not authorized to perform: ec2:RunInstances with an explicit deny in a service control policy\n")
                sys.exit(1)
            else:
                print("\nInstance launched successfully in eu-central-1!")
                print("Congratulations! Here is your flag:")
                print("PCE{scp_region_bypass_2024}\n")
        else:
            print(f"aws: error: argument subcommand: invalid choice: '{subcommand}'")
    else:
        print(f"aws: error: argument command: invalid choice: '{command}'")

if __name__ == "__main__":
    main()
