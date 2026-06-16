import sys
import json
import urllib.request
import argparse

def invoke_lambda(payload, outfile):
    url = 'http://127.0.0.1:8080'
    headers = {'Content-Type': 'application/json'}
    data = payload.encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            if outfile:
                with open(outfile, 'w') as f:
                    f.write(json.dumps(result, indent=2))
            else:
                print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "lambda" and sys.argv[2] == "invoke":
        parser = argparse.ArgumentParser()
        parser.add_argument('--function-name', required=True)
        parser.add_argument('--payload', required=True)
        parser.add_argument('--cli-binary-format', required=False)
        parser.add_argument('outfile', nargs='?')
        
        args, unknown = parser.parse_known_args(sys.argv[3:])
        
        invoke_lambda(args.payload, args.outfile)
    else:
        print("Mock AWS CLI. Try: aws lambda invoke --function-name NetworkTest --payload '{\"target\": \"127.0.0.1\"}' response.json")
