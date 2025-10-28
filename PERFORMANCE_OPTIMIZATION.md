# Performance Optimization Summary

## Problem: Top Users Chart Taking 28 Seconds

### Root Cause: N+1 Query Anti-Pattern
The dashboard was making **11 API calls** to display top users:
1. One call to get list of users
2. Ten separate calls to get API usage for each user
3. Each call scanned the entire DynamoDB CreditHistory table (15,222 items)

**Total time:** ~28 seconds
**Database scans:** 10 full table scans

### Solution: Optimized Endpoint

Created new Lambda function `V1_ReIntentAPI_AdminGetTopUsers` that:
- Makes **1 scan** of the CreditHistory table
- Counts records per user in-memory
- Sorts and returns top N users
- Batch fetches user details

**Expected time:** ~3-5 seconds
**Database scans:** 1 scan total

### Performance Improvement
- **API calls:** 11 → 1 (91% reduction)
- **Database scans:** 10 → 1 (90% reduction)  
- **Expected speedup:** 5-8x faster

## Changes Made

### Backend
1. **Created:** `lambda_admin_get_top_users.py`
   - Efficient aggregation of credit history
   - Single scan with in-memory counting
   - Returns top N users with details

2. **Lambda Function:** `V1_ReIntentAPI_AdminGetTopUsers`
   - Runtime: Python 3.9
   - Timeout: 30 seconds
   - Memory: 256 MB

### Frontend
1. **Updated:** `PremiumAnalyticsDashboard.tsx`
   - Replaced N+1 query pattern
   - Now uses `/admin/top-users` endpoint
   - Single API call instead of 10+

### Infrastructure Fixes
1. **DynamoDB Throughput Increased:**
   - `V1_ReIntentAPI_CreditHistory`
   - Read capacity: 5 → 25 units
   - Write capacity: 5 → 10 units

2. **Lambda Timeouts Increased:**
   - `lambda_admin_get_credit_history`: 3s → 30s
   - `V1_ReIntentAPI_AdminGetApiUsage`: 3s → 30s

## TODO: Add API Gateway Route

The Lambda function is created but needs to be connected to API Gateway:

```bash
# Get the admin resource ID
aws apigateway get-resources --rest-api-id lft5r6svsb --query 'items[?path==`/v1/admin`].id'

# Create the top-users resource
aws apigateway create-resource \
  --rest-api-id lft5r6svsb \
  --parent-id <ADMIN_RESOURCE_ID> \
  --path-part top-users

# Add GET method
aws apigateway put-method \
  --rest-api-id lft5r6svsb \
  --resource-id <TOP_USERS_RESOURCE_ID> \
  --http-method GET \
  --authorization-type NONE

# Integrate with Lambda
aws apigateway put-integration \
  --rest-api-id lft5r6svsb \
  --resource-id <TOP_USERS_RESOURCE_ID> \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-2:296062572725:function:V1_ReIntentAPI_AdminGetTopUsers/invocations

# Deploy
aws apigateway create-deployment \
  --rest-api-id lft5r6svsb \
  --stage-name v1
```

## Future Optimizations

### Option 1: Add total_calls to Users Table (Recommended)
- Store `total_calls` directly in `V1_ReIntentAPI_Users`
- Update on each API call
- Query time: <100ms (no scanning needed)

### Option 2: Use DynamoDB Streams
- Stream credit history changes
- Maintain aggregated counts in separate table
- Real-time updates

### Option 3: ElastiCache/Redis
- Cache top users for 5-15 minutes
- Refresh in background
- Sub-second response times

## Testing

Test the new endpoint:
```bash
curl "https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/top-users?key=ri_5437c19aa7de&limit=5"
```

Expected response:
```json
{
  "top_users": [
    {
      "user_id": "...",
      "email": "user@example.com",
      "total_calls": 6871,
      "credits": 44933,
      "plan_type": "credit_based"
    },
    ...
  ],
  "total_users_analyzed": 18
}
```
