#!/bin/bash
# Mock docker CLI for the lab environment

if [ "$1" == "ps" ]; then
    echo "CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES"
    echo "a1b2c3d4e5f6   nginx     \"nginx\"   2 days ago   Up 2 days             web-prod"
    exit 0
fi

if [ "$1" == "version" ]; then
    echo "Client: Docker Engine - Community"
    echo " Version:           24.0.5"
    echo "Server: Docker Engine - Community"
    echo " Version:           24.0.5"
    exit 0
fi

if [ "$1" == "images" ]; then
    echo "REPOSITORY   TAG       IMAGE ID       CREATED       SIZE"
    echo "ubuntu       latest    abcdef123456   2 weeks ago   72.8MB"
    echo "alpine       latest    123456abcdef   3 weeks ago   5.6MB"
    exit 0
fi

if [ "$1" == "run" ]; then
    # Check if -v /:/<something> or --privileged is present
    MOUNT_ROOT=0
    for arg in "$@"; do
        if [[ "$arg" == "/:/"* ]] || [[ "$arg" == *"-v /:/"* ]]; then
            MOUNT_ROOT=1
        fi
        if [[ "$arg" == "--privileged" ]]; then
            MOUNT_ROOT=1
        fi
    done
    
    if [ $MOUNT_ROOT -eq 1 ]; then
        echo "Root directory mounted! Executing inside privileged context..."
        echo "You have successfully escaped the container."
        echo "Flag: PCE{d0ck3r_s0ck3t_rc3_pwnd_2026}"
        exit 0
    else
        echo "Container started..."
        echo "Wait, you didn't mount the host root filesystem or use --privileged."
        echo "Try escaping to the host by mounting / to the container (e.g., docker run -v /:/host ubuntu)."
        exit 0
    fi
fi

if [ "$1" == "exec" ]; then
    echo "This is a mock docker CLI. For this lab, focus on using 'docker run' to exploit the host."
    exit 0
fi

echo "docker: '$1' is not a docker command."
echo "See 'docker --help'"
