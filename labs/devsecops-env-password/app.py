import os
import time

def connect_to_db():
    # The developer avoided hardcoding the password here!
    # They are using an environment variable instead.
    db_user = "admin"
    db_pass = os.environ.get("DB_PASSWORD")
    
    if db_pass:
        print(f"Connecting to database as {db_user}...")
        # Simulate database operations
        time.sleep(2)
        print("Connected successfully.")
    else:
        print("Error: DB_PASSWORD environment variable not set.")

if __name__ == "__main__":
    print("Starting application service...")
    while True:
        connect_to_db()
        time.sleep(10)
