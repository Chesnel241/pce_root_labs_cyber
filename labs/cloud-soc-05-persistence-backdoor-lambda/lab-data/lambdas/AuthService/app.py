import jwt
import json

def lambda_handler(event, context):
    token = event.get('headers', {}).get('Authorization')
    if not token:
        return {'statusCode': 401, 'body': 'Unauthorized'}
        
    try:
        # Mock payload check
        payload = jwt.decode(token, 'secret', algorithms=['HS256'])
        return {'statusCode': 200, 'body': json.dumps({'user': payload['user']})}
    except jwt.ExpiredSignatureError:
        return {'statusCode': 401, 'body': 'Token expired'}
    except Exception:
        return {'statusCode': 401, 'body': 'Invalid token'}
