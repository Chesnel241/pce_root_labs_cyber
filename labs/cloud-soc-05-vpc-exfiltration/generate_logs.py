import random

def generate():
    with open('/home/analyst/vpc-flow-logs.txt', 'w') as f:
        f.write("version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status\n")
        lines = []
        start_time = 1718500000
        
        # Normal web/ssh traffic
        for _ in range(5000):
            src = f"10.0.1.{random.randint(10, 250)}"
            dst = f"{random.randint(1, 200)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            sport = random.randint(1024, 65535)
            dport = random.choice([80, 443, 22])
            proto = 6
            packets = random.randint(1, 100)
            bytes_ = packets * random.randint(40, 1500)
            start = start_time + random.randint(0, 3600)
            end = start + random.randint(1, 60)
            lines.append(f"2 123456789012 eni-0a1b2c3d {src} {dst} {sport} {dport} {proto} {packets} {bytes_} {start} {end} ACCEPT OK\n")
        
        # Normal DNS noise
        for _ in range(1000):
            src = f"10.0.1.{random.randint(10, 250)}"
            dst = "8.8.8.8"
            sport = random.randint(1024, 65535)
            dport = 53
            proto = 17
            packets = random.randint(1, 5)
            bytes_ = packets * random.randint(40, 150)
            start = start_time + random.randint(0, 3600)
            end = start + random.randint(1, 60)
            lines.append(f"2 123456789012 eni-0a1b2c3d {src} {dst} {sport} {dport} {proto} {packets} {bytes_} {start} {end} ACCEPT OK\n")

        # Exfiltration DNS traffic
        exfil_ip = "198.51.100.42"
        for _ in range(150):
            src = "10.0.1.55"
            sport = random.randint(1024, 65535)
            dport = 53
            proto = 17
            packets = random.randint(1000, 5000)
            bytes_ = packets * random.randint(200, 500)
            start = start_time + random.randint(0, 3600)
            end = start + random.randint(1, 60)
            lines.append(f"2 123456789012 eni-0a1b2c3d {src} {exfil_ip} {sport} {dport} {proto} {packets} {bytes_} {start} {end} ACCEPT OK\n")
            
        random.shuffle(lines)
        for line in lines:
            f.write(line)

if __name__ == '__main__':
    generate()
