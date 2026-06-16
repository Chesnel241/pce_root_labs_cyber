import boto3

DB_USER = "admin"
# TODO: Remove this hardcoded password and fetch it from Secrets Manager!
DB_PASS = "SuperSecretPassword123!"

def get_db_password():
    # Fetch from Secrets Manager instead
    return DB_PASS

if __name__ == "__main__":
    print(f"Connecting with password: {get_db_password()}")
