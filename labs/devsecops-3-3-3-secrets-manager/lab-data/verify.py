#!/usr/bin/env python3
import ast
import sys
import os

app_path = "/home/analyst/app.py"
if not os.path.exists(app_path):
    print("Error: app.py not found!")
    sys.exit(1)

with open(app_path, "r") as f:
    content = f.read()

if "SuperSecretPassword123!" in content:
    print("Error: Hardcoded password still exists in app.py")
    sys.exit(1)

try:
    tree = ast.parse(content)
except SyntaxError:
    print("Error: Syntax Error in app.py")
    sys.exit(1)

found_boto3 = False
found_secret_id = False

for node in ast.walk(tree):
    if isinstance(node, ast.Call):
        if getattr(node.func, 'attr', '') == 'client':
            for arg in node.args:
                if isinstance(arg, ast.Constant) and arg.value == 'secretsmanager':
                    found_boto3 = True
        if getattr(node.func, 'attr', '') == 'get_secret_value':
            for kwarg in node.keywords:
                if kwarg.arg == 'SecretId' and isinstance(kwarg.value, ast.Constant) and kwarg.value.value == 'prod/db/password':
                    found_secret_id = True

if found_boto3 and found_secret_id:
    print("Great job! You have migrated to Secrets Manager.")
    print("Flag: PCE{migrated_to_secrets_manager_2024}")
else:
    print("Error: You need to use boto3.client('secretsmanager') and call get_secret_value(SecretId='prod/db/password').")
