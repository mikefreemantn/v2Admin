import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1';
const API_KEY = 'ri_5437c19aa7de';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, method, headers, data, queryParams } = body;
    
    // Construct the full URL with query parameters
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    // Add API key to query parameters
    const apiKey = body.apiKey || API_KEY;
    
    // Check if URL already has query parameters
    const hasQueryParams = url.includes('?');
    url += hasQueryParams ? '&' : '?';
    url += `key=${apiKey}`;
    
    // Add additional query parameters if provided
    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value as string);
      });
      url += `&${params.toString()}`;
    }
    
    console.log(`Proxying request to: ${url}`);
    console.log('Method:', method);
    console.log('Headers:', headers);
    console.log('Data:', data);
    
    // Make the API request
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    // Get the response data
    const responseData = await response.json().catch(() => null);
    
    // Return the response
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
