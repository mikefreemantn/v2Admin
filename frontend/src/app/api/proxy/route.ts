import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1';
const API_KEY = 'ri_9fbcb675c4e1';

// Simple in-memory cache
interface CacheItem {
  data: any;
  expiry: number;
}

const cache = new Map<string, CacheItem>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, method, headers, data, queryParams, cacheTTL = DEFAULT_CACHE_TTL, skipCache = false } = body;
    
    // Special handling for batch requests
    if (endpoint.startsWith('/admin/batch')) {
      return handleBatchRequest(endpoint, data, headers, cacheTTL, skipCache);
    }
    
    // Generate cache key for this request
    const cacheKey = generateCacheKey(endpoint, method, data, queryParams);
    
    // Check if this is a credit history request (which should always skip cache)
    const isCreditHistoryRequest = endpoint.includes('/credit-history');
    const shouldSkipCache = skipCache || isCreditHistoryRequest;
    
    // Log cache status
    if (isCreditHistoryRequest) {
      console.log('Credit history request detected - bypassing cache');
    }
    
    // Check cache if not skipping
    if (!shouldSkipCache && method?.toUpperCase() === 'GET') {
      const cachedItem = cache.get(cacheKey);
      if (cachedItem && Date.now() < cachedItem.expiry) {
        console.log(`Cache hit for: ${cacheKey}`);
        return NextResponse.json({
          status: 200,
          statusText: 'OK (Cached)',
          data: cachedItem.data
        });
      }
    }
    
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
    
    // Cache successful GET responses (but never cache credit history)
    if (!shouldSkipCache && method?.toUpperCase() === 'GET' && response.ok) {
      cache.set(cacheKey, {
        data: responseData,
        expiry: Date.now() + cacheTTL
      });
      console.log(`Cached response for: ${cacheKey}`);
    }
    
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

/**
 * Generate a cache key for a request
 */
function generateCacheKey(endpoint: string, method: string = 'GET', data?: any, queryParams?: any): string {
  return `${method}:${endpoint}:${JSON.stringify(data || {})}:${JSON.stringify(queryParams || {})}`;
}

/**
 * Handle batch requests to solve N+1 query problem
 * This function takes multiple IDs and makes a single request for all of them
 */
async function handleBatchRequest(
  endpoint: string,
  data: { ids: string[] },
  headers?: Record<string, string>,
  cacheTTL: number = DEFAULT_CACHE_TTL,
  skipCache: boolean = false
) {
  try {
    // Extract the actual endpoint (remove '/admin/batch' prefix)
    const actualEndpoint = endpoint.replace('/admin/batch', '');
    
    // Check if we have all items in cache
    const result: Record<string, any> = {};
    const missingIds: string[] = [];
    
    if (!skipCache) {
      // Try to get each item from cache
      for (const id of data.ids) {
        const itemEndpoint = `${actualEndpoint}/${id}`;
        const cacheKey = generateCacheKey(itemEndpoint, 'GET');
        const cachedItem = cache.get(cacheKey);
        
        if (cachedItem && Date.now() < cachedItem.expiry) {
          result[id] = cachedItem.data;
        } else {
          missingIds.push(id);
        }
      }
      
      // If all items were in cache, return immediately
      if (missingIds.length === 0 && data.ids.length > 0) {
        console.log('All batch items found in cache');
        return NextResponse.json({
          status: 200,
          statusText: 'OK (Cached)',
          data: result
        });
      }
    } else {
      // Skip cache, fetch all IDs
      missingIds.push(...data.ids);
    }
    
    // Fetch all missing items in parallel
    const fetchPromises = missingIds.map(async (id) => {
      const itemEndpoint = `${actualEndpoint}/${id}`;
      const url = `${API_BASE_URL}${itemEndpoint}?key=${API_KEY}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      if (response.ok) {
        const itemData = await response.json();
        
        // Cache this individual response
        if (!skipCache) {
          const cacheKey = generateCacheKey(itemEndpoint, 'GET');
          cache.set(cacheKey, {
            data: itemData,
            expiry: Date.now() + cacheTTL
          });
        }
        
        return { id, data: itemData };
      }
      
      return { id, data: null, error: `Failed to fetch ${id}` };
    });
    
    // Wait for all fetches to complete
    const fetchResults = await Promise.all(fetchPromises);
    
    // Combine cached and freshly fetched results
    fetchResults.forEach(({ id, data }) => {
      if (data) {
        result[id] = data;
      }
    });
    
    return NextResponse.json({
      status: 200,
      statusText: 'OK',
      data: result
    });
  } catch (error: any) {
    console.error('Batch request error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred processing batch request' },
      { status: 500 }
    );
  }
}
