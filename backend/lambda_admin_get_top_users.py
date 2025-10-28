import json
import boto3
from boto3.dynamodb.conditions import Key
from collections import defaultdict
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
credit_history_table = dynamodb.Table('V1_ReIntentAPI_CreditHistory')
users_table = dynamodb.Table('V1_ReIntentAPI_Users')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 10))
        
        # Scan credit history and count by user_id
        user_counts = defaultdict(int)
        
        # Use parallel scan for better performance
        response = credit_history_table.scan(
            ProjectionExpression='user_id',
            Select='SPECIFIC_ATTRIBUTES'
        )
        
        for item in response.get('Items', []):
            user_counts[item['user_id']] += 1
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = credit_history_table.scan(
                ProjectionExpression='user_id',
                Select='SPECIFIC_ATTRIBUTES',
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            for item in response.get('Items', []):
                user_counts[item['user_id']] += 1
        
        # Sort by count and get top N
        top_user_ids = sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        # Batch get user details
        top_users = []
        for user_id, count in top_user_ids:
            try:
                user_response = users_table.get_item(Key={'user_id': user_id})
                if 'Item' in user_response:
                    user = user_response['Item']
                    top_users.append({
                        'user_id': user_id,
                        'email': user.get('email', 'Unknown'),
                        'total_calls': count,
                        'credits': int(user.get('credits', 0)),
                        'plan_type': user.get('plan_type', 'unknown')
                    })
            except Exception as e:
                print(f"Error fetching user {user_id}: {str(e)}")
                continue
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'top_users': top_users,
                'total_users_analyzed': len(user_counts)
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Internal server error', 'error': str(e)})
        }
