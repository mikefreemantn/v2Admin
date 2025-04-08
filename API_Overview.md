# ReIntent API System Explainer

## Overview

This document provides a detailed explanation of the ReIntent API system, focusing on the endpoints used in the admin interface. The ReIntent API system is built on AWS API Gateway and Lambda functions, providing a comprehensive solution for user management, AI services, web scraping, and more.

## Core API Gateway

The main API Gateway for ReIntent is:

**Base URL**: `https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1`

This API Gateway handles all administrative functions, user management, and service integrations. It has multiple stages:
- `v1` - Production stage
- `test` - Testing stage

## Authentication

The API supports two authentication methods:

1. **API Key Authentication** (Recommended)
   - Pass the API key as a query parameter: `?key=ri_5437c19aa7de`
   - This method avoids CORS preflight requests, making it more reliable for browser-based applications

2. **Bearer Token Authentication**
   - Pass the token in the Authorization header: `Authorization: Bearer ${ADMIN_PASSWORD}`
   - This method triggers CORS preflight requests, which may cause issues with browser-based applications

## Admin Interface API Endpoints

The admin interface uses the following key endpoints:

### 1. User Management

#### Get All Users
```
GET https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/users?key=ri_5437c19aa7de
```

This endpoint retrieves all users in the system along with domain usage information.

**Response Format**:
```json
{
  "users": [
    {
      "user_id": "9629a446-07e8-487d-bafa-6d922a0b3cec",
      "email": "user@example.com",
      "access_key": "ri_5e7b946609b5",
      "allow_multiple_domains": false,
      "created_at": 1740355249.0,
      "updated_at": 1743717651.0,
      "plan_type": "credit_based",
      "status": "active",
      "credits": 150.0,
      "stripe_customer_id": "cus_S3IHdjc3CdNi55"
    },
    // Additional users...
  ],
  "domain_usage": {
    "users": [
      {
        "user_id": "9629a446-07e8-487d-bafa-6d922a0b3cec",
        "email": "user@example.com",
        "access_key": "ri_5e7b946609b5",
        "domains": ["example.com", "localhost"],
        "domain_count": 8,
        "status": "active",
        "allow_multiple_domains": false
      },
      // Additional domain usage per user...
    ],
    "domain_counts": {
      "example.com": 2,
      "localhost": 4,
      // Additional domain counts...
    }
  }
}
```

#### Update User
```
PUT https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/users/{user_id}?key=ri_5437c19aa7de
```

This endpoint updates a specific user's information.

**Request Body**:
```json
{
  "status": "active",
  "credits": 100,
  "plan_type": "credit_based",
  "allow_multiple_domains": true
}
```

#### Delete User
```
DELETE https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/users/{user_id}/delete?key=ri_5437c19aa7de
```

This endpoint deletes a specific user from the system.

#### Get User Credit History
```
GET https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/users/{user_id}/credit-history?key=ri_5437c19aa7de
```

This endpoint retrieves the credit history for a specific user.

**Response Format**:
```json
{
  "history": [
    {
      "transaction_id": "txn_123456",
      "timestamp": 1743348305.0,
      "amount": 10.0,
      "type": "deduction",
      "description": "API usage",
      "service": "chatgpt"
    },
    // Additional transactions...
  ]
}
```

### 2. API Usage Analytics

#### Get Overall API Usage
```
GET https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/api-usage?key=ri_5437c19aa7de
```

This endpoint retrieves overall API usage statistics across all users.

**Response Format**:
```json
{
  "api_usage": [
    {
      "date": "2025-03-08",
      "count": 91,
      "by_service": {
        "chatgpt": 91,
        "firecrawl": 0
      }
    },
    // Additional daily usage data...
  ],
  "total_calls": 2489
}
```

#### Get User-Specific API Usage
```
GET https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/api-usage?key=ri_5437c19aa7de&user_id={user_id}
```

This endpoint retrieves API usage statistics for a specific user.

**Optional Parameters**:
- `start_date`: Filter usage from this date (format: YYYY-MM-DD)
- `end_date`: Filter usage until this date (format: YYYY-MM-DD)

**Response Format**:
```json
{
  "api_usage": [
    {
      "date": "2025-03-08",
      "count": 15,
      "by_service": {
        "chatgpt": 12,
        "firecrawl": 3
      }
    },
    // Additional daily usage data for the specific user...
  ],
  "total_calls": 245
}
```

### 3. Chart Notes

#### Get Chart Notes
```
GET https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/chart-notes?key=ri_5437c19aa7de
```

This endpoint retrieves notes associated with the API usage charts.

**Optional Parameters**:
- `context`: Filter notes by context (e.g., 'main', 'user')
- `user_id`: Filter notes for a specific user

**Response Format**:
```json
{
  "notes": [
    {
      "id": "note_123456",
      "date": "2025-03-15",
      "title": "Service Outage",
      "content": "ChatGPT service was down for 2 hours",
      "context": "main",
      "user_id": null,
      "created_at": 1742351793.0
    },
    // Additional notes...
  ]
}
```

## Implementation in the Admin Interface

### Loading Users Table

The admin interface loads the users table using the following JavaScript code:

```javascript
async function loadUsers() {
  console.log('Loading users from API...');
  
  try {
    // Using query parameter authentication to avoid CORS issues
    const apiUrl = 'https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/users?key=ri_5437c19aa7de';
    console.log('API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    users = data.users || [];
    
    // Process timestamps to display in US Central time
    users.forEach(user => {
      if (user.created_at) {
        user.created_at_formatted = new Date(user.created_at * 1000).toLocaleString('en-US', { timeZone: 'America/Chicago' });
      }
      if (user.updated_at) {
        user.updated_at_formatted = new Date(user.updated_at * 1000).toLocaleString('en-US', { timeZone: 'America/Chicago' });
      }
    });
    
    // Display users in the table
    displayUsers(users);
    
    // Check domain usage
    checkDomainUsage();
    
    return users;
  } catch (error) {
    console.error('Error loading users:', error);
    document.getElementById('userTableBody').innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          Error loading users: ${error.message}
        </td>
      </tr>
    `;
    return [];
  }
}
```

### Loading API Usage Chart Data

The admin interface loads API usage data for charts using the following JavaScript code:

```javascript
async function loadApiUsageData(startDate = null, endDate = null) {
  console.log('Loading API usage data...');
  
  try {
    // Build the API URL with the correct endpoint and parameters
    let apiUrl = `https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/api-usage`;
    
    // Add the API key as a query parameter to avoid CORS preflight
    apiUrl += `?key=ri_5437c19aa7de`;
    
    if (startDate) apiUrl += `&start_date=${startDate}`;
    if (endDate) apiUrl += `&end_date=${endDate}`;
    console.log('Using API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API usage data response:', data);
    
    // Process the data for chart rendering
    // ...processing code...
    
    return {
      overall: processedData.overall || [],
      by_user: processedData.by_user || {},
      by_service: processedData.by_service || {},
      by_date: processedData.by_date || {},
      by_user_date: processedData.by_user_date || {},
      total_requests: processedData.total_requests || 0,
      date_range: processedData.date_range || { start: null, end: null },
      user_stats: processedData.user_stats || [],
      notes: data.notes || [],
      user_id: typeof currentUserId !== 'undefined' ? currentUserId : null
    };
  } catch (error) {
    console.error('Error loading API usage data:', error);
    showNotification(`Error loading API usage data: ${error.message}`, 'error');
    throw error;
  }
}
```

### Loading User-Specific API Usage Data

For user-specific API usage data, the admin interface uses:

```javascript
async function loadUserApiUsageData(userId, startDate = null, endDate = null) {
  try {
    console.log('Loading API usage data for user:', userId);
    // Add the API key as a query parameter to avoid CORS preflight
    let url = `https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1/admin/api-usage?key=ri_5437c19aa7de&user_id=${userId}`;
    console.log('Using user-specific API URL:', url);
    if (startDate || endDate) {
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
    }
    
    // Use simple headers that don't trigger preflight
    const userApiHeaders = {
      'Accept': 'application/json'
    };
    
    const response = await fetch(url, {
      method: 'GET',
      headers: userApiHeaders,
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    
    // Process the API usage data
    // ...processing code...
    
    return data.api_usage;
  } catch (error) {
    console.error('Error loading user API usage data:', error);
    throw error;
  }
}
```

## Best Practices for API Integration

1. **Use Query Parameter Authentication**
   - Pass the API key as a query parameter (`?key=ri_5437c19aa7de`) instead of using headers
   - This avoids CORS preflight requests which can cause issues in browser-based applications

2. **Handle Timestamps Properly**
   - API returns timestamps in Unix time (seconds since epoch)
   - Convert to local time for display: `new Date(timestamp * 1000).toLocaleString()`
   - For ReIntent admin interface, display in US Central time: `{ timeZone: 'America/Chicago' }`

3. **Implement Proper Error Handling**
   - Always check `response.ok` before processing the response
   - Provide meaningful error messages to users
   - Log detailed error information for debugging

4. **Use Appropriate Content Types**
   - Set `Accept: application/json` header for all requests
   - Set `Content-Type: application/json` header for requests with a body

5. **Implement Date Filtering**
   - Use `start_date` and `end_date` parameters for filtering API usage data
   - Format dates as YYYY-MM-DD for API requests

## Service-Specific APIs

In addition to the main API Gateway, ReIntent has dedicated API Gateways for specific services:

1. **ChatGPT API**: `https://1xt5le1gn6.execute-api.us-east-2.amazonaws.com/v1`
   - Used for AI text generation

2. **Firecrawl API**: `https://cnn1mq9b3k.execute-api.us-east-2.amazonaws.com/test`
   - Used for web scraping and content extraction

3. **DALL-E API**: `https://r3yyj29u69.execute-api.us-east-2.amazonaws.com`
   - Used for AI image generation

4. **Pexels API**: `https://khkx8gq9wg.execute-api.us-east-2.amazonaws.com`
   - Used for image search

These service-specific APIs are typically not accessed directly from the admin interface but are used by the main API Gateway for service integration.

## Conclusion

The ReIntent API system provides a comprehensive set of endpoints for managing users, tracking API usage, and integrating with various AI services. The admin interface uses these endpoints to provide a user-friendly way to manage the system, view analytics, and monitor user activity.

For any questions or issues with the API, please contact the development team.
