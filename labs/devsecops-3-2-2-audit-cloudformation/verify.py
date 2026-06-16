#!/usr/bin/env python3
import yaml
import sys

# Custom YAML loader to handle basic CFN intrinsic functions silently
class SafeLoaderIgnoreUnknown(yaml.SafeLoader):
    pass
SafeLoaderIgnoreUnknown.add_multi_constructor('!', lambda loader, suffix, node: None)

def check_template():
    try:
        with open('template.yaml', 'r') as f:
            template = yaml.load(f, Loader=SafeLoaderIgnoreUnknown)
    except Exception as e:
        print("Error reading template.yaml:", e)
        return False

    if not template or 'Resources' not in template:
        print("[-] Invalid CloudFormation template format.")
        return False

    resources = template.get('Resources', {})
    
    # Check Bucket
    bucket = resources.get('MyVulnerableBucket', {}).get('Properties', {})
    encryption = bucket.get('BucketEncryption', {})
    rules = encryption.get('ServerSideEncryptionConfiguration', [])
    has_encryption = False
    for rule in rules:
        if rule.get('ServerSideEncryptionByDefault', {}).get('SSEAlgorithm') == 'AES256':
            has_encryption = True
            
    if not has_encryption:
        print("[-] The S3 bucket is missing Server-Side Encryption (AES256).")
        return False
        
    # Check Security Group
    sg = resources.get('MyVulnerableSecurityGroup', {}).get('Properties', {})
    ingress = sg.get('SecurityGroupIngress', [])
    open_ssh = False
    for rule in ingress:
        if str(rule.get('FromPort')) == '22' and str(rule.get('ToPort')) == '22':
            if rule.get('CidrIp') == '0.0.0.0/0':
                open_ssh = True
                
    if open_ssh:
        print("[-] The Security Group allows SSH (port 22) from 0.0.0.0/0.")
        return False
        
    return True

if __name__ == '__main__':
    print("Checking template.yaml...")
    if check_template():
        print("[+] Template secured successfully!")
        print("[+] Flag: PCE{cfn_auditing_and_securing_2026}")
    else:
        print("\nKeep trying! Fix the issues and run the script again.")
