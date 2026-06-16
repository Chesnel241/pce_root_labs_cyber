#!/usr/bin/env python3
import sys
import yaml

def main():
    if len(sys.argv) < 3 or sys.argv[1] != 'apply' or sys.argv[2] != '-f':
        print("Mock kubectl. Usage: kubectl apply -f <file.yaml>")
        sys.exit(1)
        
    filename = sys.argv[3]
    try:
        with open(filename, 'r') as f:
            manifests = list(yaml.safe_load_all(f))
    except Exception as e:
        print(f"Error reading YAML: {e}")
        sys.exit(1)
        
    for pod in manifests:
        if not pod:
            continue
        if pod.get('kind') != 'Pod':
            print(f"Error: Only Pods are supported in this mock. Found: {pod.get('kind')}")
            sys.exit(1)
            
        spec = pod.get('spec', {})
        
        # Admission Controller (PSP) Checks
        containers = spec.get('containers', [])
        for c in containers:
            sec = c.get('securityContext', {})
            if sec.get('privileged') is True:
                print("Error from server (Forbidden): error when creating pod: pods \"{}\" is forbidden: unable to validate against any pod security policy: [spec.containers[0].securityContext.privileged: Invalid value: true: Privileged containers are not allowed]".format(pod.get('metadata', {}).get('name', 'pod')))
                sys.exit(1)
                
        if spec.get('hostNetwork') is True:
            print("Error from server (Forbidden): error when creating pod: pods \"{}\" is forbidden: unable to validate against any pod security policy: [spec.hostNetwork: Invalid value: true: Host network is not allowed]".format(pod.get('metadata', {}).get('name', 'pod')))
            sys.exit(1)
            
        if spec.get('hostPID') is True:
            print("Error from server (Forbidden): error when creating pod: pods \"{}\" is forbidden: unable to validate against any pod security policy: [spec.hostPID: Invalid value: true: Host PID is not allowed]".format(pod.get('metadata', {}).get('name', 'pod')))
            sys.exit(1)
            
        if spec.get('hostIPC') is True:
            print("Error from server (Forbidden): error when creating pod: pods \"{}\" is forbidden: unable to validate against any pod security policy: [spec.hostIPC: Invalid value: true: Host IPC is not allowed]".format(pod.get('metadata', {}).get('name', 'pod')))
            sys.exit(1)

        print("pod/{} created".format(pod.get('metadata', {}).get('name', 'test-pod')))
        
        # Simulate execution
        volumes = spec.get('volumes', [])
        has_host_path = False
        for v in volumes:
            if 'hostPath' in v:
                path = v['hostPath'].get('path', '')
                if path.startswith('/') and not path.startswith('/tmp'):
                    has_host_path = True
                    break
                    
        if has_host_path:
            print("\n[Simulator] The pod successfully started and mounted the host filesystem.")
            print("[Simulator] You inspect the pod's filesystem and find the host's secret flag:")
            print("PCE{psp_bypass_2024}")
        else:
            print("\n[Simulator] The pod successfully started, but did not mount any sensitive host paths.")
            print("[Simulator] No flags were found. Delete the pod and try again with a different configuration.")
        
if __name__ == '__main__':
    main()
