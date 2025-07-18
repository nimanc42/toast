import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Special handling for auth errors - but only for specific endpoints
    if (res.status === 401 && res.url.includes('/api/auth/verify')) {
      // Only clear token if explicitly told by auth verification endpoint
      const token = localStorage.getItem('authToken');
      if (token) {
        console.warn('Auth token explicitly rejected by server, clearing...');
        localStorage.removeItem('authToken');
      }
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth token from localStorage if it exists
  const token = localStorage.getItem('authToken');
  
  // Set up headers with auth token if available
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    console.log(`Including auth token in ${method} request to ${url}`);
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Always include credentials for cookies
  });

  // For login, don't throw error since we want to handle the response specially
  if (url === '/api/login' && method.toUpperCase() === 'POST') {
    if (!res.ok) {
      console.error(`Login request failed: ${res.status} ${res.statusText}`);
    }
    return res;
  }

  // For all other requests, handle errors normally
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Include authorization header if token exists
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('authToken');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    // Special handling for 401 based on configuration
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // Only log the 401 but don't clear the token - let the session cookie handle authentication
      if (token) {
        console.log('Got 401 on a query with auth token, but keeping token for next attempt');
        
        // If we keep getting 401s, it might be because the token is expired
        // Check if this is happening repeatedly and clear the token after multiple failures
        const failureCount = parseInt(localStorage.getItem('auth401Count') || '0');
        if (failureCount > 3) {
          console.warn('Multiple 401 errors detected, clearing potentially stale token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('authTokenExpiry');
          localStorage.removeItem('auth401Count');
        } else {
          localStorage.setItem('auth401Count', (failureCount + 1).toString());
        }
      }
      return null;
    }
    
    // Clear 401 counter on successful requests
    if (res.ok && localStorage.getItem('auth401Count')) {
      localStorage.removeItem('auth401Count');
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
