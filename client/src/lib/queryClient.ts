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
export function getQueryFn({ on401 }: { on401: "throw" | "returnNull" } = { on401: "throw" }) {
  return async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const pathAndSearch = (queryKey[0] as string);

    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');

    const options: RequestInit = {
      credentials: 'include',
    };

    // Add Authorization header if token exists
    if (token) {
      options.headers = {
        'Authorization': `Bearer ${token}`,
      };
    }

    const res = await fetch(pathAndSearch, options);

    if (res.status === 401) {
      // Try to parse the error response to check for clearToken flag
      try {
        const errorData = await res.json();
        if (errorData.clearToken) {
          console.log("Server requested token clear, removing invalid token");
          localStorage.removeItem('authToken');
          localStorage.removeItem('authTokenExpiry');
        }
      } catch (parseError) {
        // If we can't parse the error response, clear the token anyway for 401s with existing token
        if (token) {
          console.log("Got 401 with token, clearing potentially invalid token");
          localStorage.removeItem('authToken');
          localStorage.removeItem('authTokenExpiry');
        }
      }

      if (on401 === "throw") {
        throw new Error("Unauthorized");
      } else {
        return null;
      }
    }

    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    return res.json();
  };
}

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