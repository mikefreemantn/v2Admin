import { apiCache } from './cache';

interface FetcherOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  endpoint: string;
  cacheTTL?: number; // Time-to-live in milliseconds
  skipCache?: boolean; // Option to bypass cache
}

/**
 * Custom fetcher for SWR that uses our API cache
 * @param key Cache key (can be a string or an object with options)
 * @returns Promise with the fetched data
 */
export const fetcher = async (key: string | FetcherOptions) => {
  // Parse the key if it's a string
  const options: FetcherOptions = typeof key === 'string' 
    ? { endpoint: key }
    : key;
  
  const { 
    method = 'GET',
    headers = {},
    body,
    endpoint,
    cacheTTL,
    skipCache = false 
  } = options;

  // Generate a cache key based on the request details
  const cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;
  
  // Check cache first if not skipping cache
  if (!skipCache) {
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  // Make the API request through our proxy with cache-busting parameter
  const timestamp = new Date().getTime();
  const response = await fetch(`/api/proxy?_t=${timestamp}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      endpoint,
      method,
      data: body,
    }),
  });

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object
    (error as any).info = await response.json();
    (error as any).status = response.status;
    throw error;
  }

  const responseBody = await response.json();
  
  // Debug logs to understand the proxy response structure
  console.log(`API Response for ${endpoint}:`, responseBody);
  
  // Extract the actual API response data from the proxy response
  // The proxy wraps the API response in a data property
  const data = responseBody.data || responseBody;
  console.log(`Extracted data for ${endpoint}:`, data);
  
  // Cache the successful response if not skipping cache
  if (!skipCache) {
    apiCache.set(cacheKey, data, cacheTTL);
  }

  return data;
};

/**
 * Helper function to invalidate cache entries by endpoint prefix
 * @param endpointPrefix Prefix of endpoints to invalidate
 */
export const invalidateCache = (endpointPrefix: string) => {
  apiCache.clearByPrefix(`GET:${endpointPrefix}`);
  apiCache.clearByPrefix(`POST:${endpointPrefix}`);
  apiCache.clearByPrefix(`PUT:${endpointPrefix}`);
  apiCache.clearByPrefix(`DELETE:${endpointPrefix}`);
};
