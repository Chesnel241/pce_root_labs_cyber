#!/usr/bin/env python3
import sys
import json

def main():
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "rds" and args[1] == "describe-db-instances":
        print(json.dumps({
            "DBInstances": [
                {
                    "DBInstanceIdentifier": "prod-db-1",
                    "Endpoint": {
                        "Address": "rds-prod-1.aws.local",
                        "Port": 3306
                    },
                    "PubliclyAccessible": True,
                    "MasterUsername": "admin",
                    "Engine": "mysql"
                }
            ]
        }, indent=4))
    else:
        print("usage: aws rds describe-db-instances")

if __name__ == "__main__":
    main()
