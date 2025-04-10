import useSWR from 'swr';
import { fetcher, invalidateCache } from '@/lib/fetcher';

interface UseApiOptions {
  refreshInterval?: number;
  dedupingInterval?: number;
  revalidateOnFocus?: boolean;
  cacheTTL?: number;
  skipCache?: boolean;
}

/**
 * Custom hook for fetching API data with caching
 * @param endpoint API endpoint or null to skip fetching
 * @param method HTTP method
 * @param body Request body
 * @param options Additional options
 * @returns SWR response with data, error, and loading state
 */
export function useApiData<T = any>(
  endpoint: string | null,
  method: string = 'GET',
  body?: any,
  options: UseApiOptions = {}
) {
  const {
    refreshInterval,
    dedupingInterval = 5000,
    revalidateOnFocus = true,
    cacheTTL,
    skipCache = false,
  } = options;

  const { data, error, isLoading, mutate } = useSWR(
    endpoint ? {
      endpoint,
      method,
      body,
      cacheTTL,
      skipCache,
    } : null,
    fetcher,
    {
      refreshInterval,
      dedupingInterval,
      revalidateOnFocus,
    }
  );

  return {
    data: data as T,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Custom hook for fetching multiple related API data in a single request
 * Solves the N+1 query problem by batching requests
 * @param baseEndpoint Base API endpoint
 * @param ids Array of IDs to fetch
 * @param options Additional options
 * @returns Object with data, error, and loading state
 */
export function useBatchApiData<T = any>(
  baseEndpoint: string,
  ids: string[],
  options: UseApiOptions = {}
) {
  // Create a batch endpoint that accepts multiple IDs
  const batchEndpoint = `/admin/batch${baseEndpoint}`;
  
  // Only make the API call if we have IDs to fetch
  // This prevents unnecessary API calls when the users data hasn't loaded yet
  const shouldFetch = ids && ids.length > 0;
  
  const { data, error, isLoading, mutate } = useApiData<Record<string, T>>(
    shouldFetch ? batchEndpoint : null, // Only fetch if we have IDs
    'POST',
    shouldFetch ? { ids } : null,
    options
  );

  return {
    data,
    error,
    isLoading,
    mutate,
    // Helper to get a specific item by ID
    getItem: (id: string) => data?.[id],
  };
}

/**
 * Helper function to invalidate cache for specific endpoints
 * @param endpointPrefix Prefix of endpoints to invalidate
 */
export function invalidateApiCache(endpointPrefix: string) {
  invalidateCache(endpointPrefix);
}
