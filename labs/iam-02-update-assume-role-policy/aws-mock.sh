#!/bin/bash

# Mock AWS CLI for lab IAM 2.2.3
COMMAND=$1
SUBCOMMAND=$2

if [ "$COMMAND" == "iam" ] && [ "$SUBCOMMAND" == "update-assume-role-policy" ]; then
    ROLE_NAME=""
    POLICY_DOC=""
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --role-name) ROLE_NAME="$2"; shift ;;
            --policy-document) POLICY_DOC="$2"; shift ;;
        esac
        shift
    done
    
    if [ "$ROLE_NAME" != "admin-role" ]; then
        echo "An error occurred (NoSuchEntity) when calling the UpdateAssumeRolePolicy operation: The role with name $ROLE_NAME cannot be found."
        exit 1
    fi
    
    if [ -z "$POLICY_DOC" ]; then
        echo "Missing --policy-document. You must provide a JSON policy document."
        exit 1
    fi
    
    # Check if policy document contains 'file://'
    if [[ "$POLICY_DOC" == file://* ]]; then
        FILE_PATH="${POLICY_DOC#file://}"
        if [ ! -f "$FILE_PATH" ]; then
            echo "Error parsing parameter '--policy-document': Unable to load paramfile file://$FILE_PATH"
            exit 1
        fi
        POLICY_CONTENT=$(cat "$FILE_PATH")
    else
        POLICY_CONTENT="$POLICY_DOC"
    fi
    
    # Basic validation
    if echo "$POLICY_CONTENT" | grep -qi "dev-user"; then
        echo "$POLICY_CONTENT" > /tmp/admin_role_trust.json
    else
        echo "Policy updated. (Warning: It doesn't seem to trust 'dev-user')"
        echo "$POLICY_CONTENT" > /tmp/admin_role_trust.json
    fi
    exit 0
fi

if [ "$COMMAND" == "sts" ] && [ "$SUBCOMMAND" == "assume-role" ]; then
    ROLE_ARN=""
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --role-arn) ROLE_ARN="$2"; shift ;;
        esac
        shift
    done
    
    if [ "$ROLE_ARN" != "arn:aws:iam::123456789012:role/admin-role" ]; then
        echo "An error occurred (AccessDenied) when calling the AssumeRole operation: User is not authorized to perform: sts:AssumeRole on resource."
        exit 1
    fi
    
    if [ ! -f /tmp/admin_role_trust.json ]; then
        echo "An error occurred (AccessDenied) when calling the AssumeRole operation: User is not authorized to perform: sts:AssumeRole on resource."
        exit 1
    fi
    
    if grep -qi "dev-user" /tmp/admin_role_trust.json; then
        echo "{"
        echo "    \"Credentials\": {"
        echo "        \"AccessKeyId\": \"ASIA_MOCK_ADMIN_KEY\", "
        echo "        \"SecretAccessKey\": \"mock_admin_secret_key\", "
        echo "        \"SessionToken\": \"mock_admin_session_token\""
        echo "    },"
        echo "    \"AssumedRoleUser\": {"
        echo "        \"AssumedRoleId\": \"AROA_MOCK_ADMIN:session\", "
        echo "        \"Arn\": \"$ROLE_ARN\""
        echo "    }"
        echo "}"
        echo ""
        echo "Success! You assumed the admin role."
        echo "FLAG: PCE{update_assume_role_policy_admin_2024}"
        exit 0
    else
        echo "An error occurred (AccessDenied) when calling the AssumeRole operation: User is not authorized to perform: sts:AssumeRole on resource."
        exit 1
    fi
fi

if [ "$COMMAND" == "iam" ] && [ "$SUBCOMMAND" == "get-role" ]; then
    ROLE_NAME=""
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --role-name) ROLE_NAME="$2"; shift ;;
        esac
        shift
    done
    if [ "$ROLE_NAME" == "admin-role" ]; then
        echo "{"
        echo "    \"Role\": {"
        echo "        \"Path\": \"/\", "
        echo "        \"RoleName\": \"admin-role\", "
        echo "        \"RoleId\": \"AROA_MOCK_ADMIN\", "
        echo "        \"Arn\": \"arn:aws:iam::123456789012:role/admin-role\", "
        echo "        \"CreateDate\": \"2024-01-01T00:00:00Z\", "
        echo "        \"AssumeRolePolicyDocument\": {"
        echo "            \"Version\": \"2012-10-17\", "
        echo "            \"Statement\": ["
        echo "                {"
        echo "                    \"Effect\": \"Allow\", "
        echo "                    \"Principal\": {"
        echo "                        \"AWS\": \"arn:aws:iam::123456789012:root\""
        echo "                    }, "
        echo "                    \"Action\": \"sts:AssumeRole\""
        echo "                }"
        echo "            ]"
        echo "        }"
        echo "    }"
        echo "}"
        exit 0
    fi
fi

echo "aws: command not found or not supported in this mock: $COMMAND $SUBCOMMAND"
echo "Hint: Try 'aws iam update-assume-role-policy' and 'aws sts assume-role'."
