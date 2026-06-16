import json

def lambda_handler(event, context):
    print("Processing order...")
    # Process order details from event
    order_id = event.get('order_id', 'unknown')
    print(f"Order ID: {order_id}")
    
    return {
        'statusCode': 200,
        'body': json.dumps(f"Order {order_id} processed successfully!")
    }
