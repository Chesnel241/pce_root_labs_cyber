FROM python:3.9-slim

WORKDIR /app

# DANGER: Copying the entire directory including secrets, .git, etc.
COPY . .

# DANGER: Hardcoded secrets in environment variables
ENV AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
ENV AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
ENV APP_ADMIN_TOKEN="PCE{d0ck3rf1l3_s3cr3t_l34k_2024}"

RUN pip install -r requirements.txt

# DANGER: Running as root (default)
EXPOSE 8080
CMD ["python", "app.py"]
