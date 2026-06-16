#!/usr/bin/env python3
import sys

def main():
    host = None
    user = None
    password = None
    
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        arg = args[i]
        if arg == '-h':
            host = args[i+1] if i+1 < len(args) else ""
            i += 1
        elif arg.startswith('-h'):
            host = arg[2:]
        elif arg == '-u':
            user = args[i+1] if i+1 < len(args) else ""
            i += 1
        elif arg.startswith('-u'):
            user = arg[2:]
        elif arg == '-p':
            if i + 1 < len(args) and not args[i+1].startswith('-'):
                password = args[i+1]
                i += 1
            else:
                password = ""
        elif arg.startswith('-p'):
            password = arg[2:]
        i += 1

    if password == "" or password is None:
        try:
            import getpass
            password = getpass.getpass("Enter password: ")
        except:
            password = input("Enter password: ")
            
    if host == "rds-prod-1.aws.local" and user == "admin" and password == "admin123":
        print("Welcome to the MySQL monitor.  Commands end with ; or \\g.")
        print("Your MySQL connection id is 1")
        print("Server version: 8.0.32 Source distribution\n")
        while True:
            try:
                cmd = input("mysql> ")
                cmd_lower = cmd.lower()
                if cmd_lower in ['exit', 'quit', 'exit;', 'quit;']:
                    print("Bye")
                    break
                elif "show tables" in cmd_lower or "show tables;" in cmd_lower:
                    print("+-----------------+\n| Tables_in_prod  |\n+-----------------+\n| users           |\n| flags           |\n+-----------------+")
                elif "select" in cmd_lower and "flags" in cmd_lower:
                    print("+-----------------------+\n| flag                  |\n+-----------------------+\n| PCE{rds_pUbl1c_2024}  |\n+-----------------------+")
                elif cmd.strip() == "":
                    pass
                else:
                    print("Empty set (0.00 sec)")
            except (EOFError, KeyboardInterrupt):
                print("\nBye")
                break
    elif host == "rds-prod-1.aws.local":
        print(f"ERROR 1045 (28000): Access denied for user '{user}'@'localhost' (using password: YES)")
    else:
        print(f"ERROR 2005 (HY000): Unknown MySQL server host '{host}' (0)")

if __name__ == "__main__":
    main()
