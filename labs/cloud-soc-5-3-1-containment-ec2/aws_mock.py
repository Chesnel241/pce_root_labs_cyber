#!/usr/bin/env python3
import sys
import json

flag = "PCE{ec2_containment_2024}"

def describe_instances():
    data = {
        "Reservations": [
            {
                "Instances": [
                    {
                        "InstanceId": "i-badc0ffee",
                        "InstanceType": "t3.micro",
                        "State": {"Name": "running"},
                        "PublicIpAddress": "203.0.113.50",
                        "SecurityGroups": [
                            {"GroupName": "default", "GroupId": "sg-12345678"},
                            {"GroupName": "web-tier", "GroupId": "sg-87654321"}
                        ],
                        "Tags": [{"Key": "Name", "Value": "VulnerableWebApp"}]
                    }
                ]
            }
        ]
    }
    print(json.dumps(data, indent=4))

def describe_security_groups():
    data = {
        "SecurityGroups": [
            {
                "GroupName": "default",
                "GroupId": "sg-12345678",
                "Description": "default VPC security group"
            },
            {
                "GroupName": "web-tier",
                "GroupId": "sg-87654321",
                "Description": "Web tier SG"
            },
            {
                "GroupName": "isolated-containment",
                "GroupId": "sg-isolated",
                "Description": "No ingress/egress rules for incident response containment"
            }
        ]
    }
    print(json.dumps(data, indent=4))

def modify_instance_attribute(args):
    if '--instance-id' in args and 'i-badc0ffee' in args:
        if '--groups' in args:
            idx = args.index('--groups')
            # Look at values after --groups until another flag or end
            groups = []
            for arg in args[idx+1:]:
                if arg.startswith('--'):
                    break
                groups.append(arg)
            
            if 'sg-isolated' in groups and len(groups) == 1:
                print("Successfully modified instance i-badc0ffee.")
                print("Congratulations! You have fully contained the compromise by replacing its security groups.")
                print(f"Flag: {flag}")
            elif 'sg-isolated' in groups:
                print("Instance modified, but it still has other security groups attached! It is not fully contained.")
            else:
                print("Instance modified, but is it contained? (Hint: try the isolated containment security group)")
        else:
            print("Missing --groups parameter.")
    else:
        print("Invalid instance ID or missing parameters.")

def main():
    if len(sys.argv) < 2:
        print("Usage: aws <command> <subcommand> [parameters]")
        sys.exit(1)
        
    cmd = sys.argv[1]
    
    if cmd == 'ec2':
        if len(sys.argv) < 3:
            sys.exit(1)
        subcmd = sys.argv[2]
        if subcmd == 'describe-instances':
            describe_instances()
        elif subcmd == 'describe-security-groups':
            describe_security_groups()
        elif subcmd == 'modify-instance-attribute':
            modify_instance_attribute(sys.argv[3:])
        else:
            print(f"Unknown sub-command: {subcmd}")
    else:
        print("Mock AWS CLI. Try 'aws ec2 describe-instances'")

if __name__ == '__main__':
    main()
