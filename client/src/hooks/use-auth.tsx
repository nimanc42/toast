import React, { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User, LoginUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Define response types for auth API
type LoginResponse = {
  user: Omit<User, "password">;
  token: string;
};

type RegisterResponse = {
  user: Omit<User, "password">;
  token: string;
};

type AuthContextType = {
  user: Omit<User, "password"> | null;
  isLoading: boolean;
  error: Error | null;
  isTestingMode: boolean;
  loginMutation: UseMutationResult<LoginResponse, Error, LoginUser>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<RegisterResponse, Error, z.infer<typeof insertUserSchema>>;
  enterTestingModeMutation: UseMutationResult<Omit<User, "password">, Error, void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Check application config to determine if testing mode is available
  const { data: configData } = useQuery<{ testingModeEnabled: boolean, testingMode: boolean }, Error>({
    queryKey: ["/api/config/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });
  
  // Get user data
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<Omit<User, "password"> | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Check for token in localStorage on initial render and auto-validate
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const tokenExpiry = localStorage.getItem('authTokenExpiry');
    
    // Check if token exists
    if (token) {
      console.log('Auth token found in localStorage');
      
      // Check if token is expired based on client-side expiry date
      if (tokenExpiry) {
        const expiryDate = new Date(tokenExpiry);
        const now = new Date();
        
        if (now > expiryDate) {
          console.warn('Auth token client-side expiry date reached');
          // Don't immediately clear - let the server decide if it's still valid
          // Just trigger a revalidation
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }
      }
      
      // If there's a token but no user, attempt to validate and refresh the auth state
      if (!user && !isLoading) {
        console.log('No user in state, validating token and refreshing auth');
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
    }
  }, [user, isLoading]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      
      // Check if the response is not ok (failed login)
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      return await res.json();
    },
    onSuccess: (response: LoginResponse) => {
      // Only execute this if we have a valid response with user and token
      if (!response.user || !response.token) {
        throw new Error("Invalid login response");
      }
      
      // Store the JWT token in localStorage
      localStorage.setItem('authToken', response.token);
      
      // Set token expiry indicator (1 week from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      localStorage.setItem('authTokenExpiry', expiryDate.toISOString());
      
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], response.user);
      
      // Force clear 401 errors in cache
      queryClient.clear();
      
      // Wait a moment for the session to be established
      setTimeout(() => {
        console.log("Refreshing queries after login");
        // Invalidate all queries to refresh them with new authentication
        queryClient.invalidateQueries();
      }, 500);
      
      toast({
        title: "Welcome back!",
        description: `You've successfully logged in.`,
      });
    },
    onError: (error: Error) => {
      // Clear any existing token on login failure
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenExpiry');
      
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof insertUserSchema>) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (response: RegisterResponse) => {
      // Store the JWT token in localStorage
      localStorage.setItem('authToken', response.token);
      
      // Set token expiry indicator (1 week from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      localStorage.setItem('authTokenExpiry', expiryDate.toISOString());
      
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], response.user);
      
      // Invalidate all queries to refresh them with new authentication
      queryClient.invalidateQueries();
      
      toast({
        title: "Registration successful!",
        description: "Your account has been created.",
      });
    },
    onError: (error: Error) => {
      // Clear any existing token on registration failure
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenExpiry');
      
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear JWT token and expiry on logout
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenExpiry');
      
      // Clear user data from query cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Reset all queries to ensure clean state
      queryClient.resetQueries();
      
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      // Even if server logout fails, clear local auth state
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenExpiry');
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout issues",
        description: "There was an issue logging out from the server, but you've been logged out locally.",
        variant: "destructive",
      });
      
      console.error("Logout error:", error.message);
    },
  });

  // Testing mode mutation - simplified to avoid server crashes
  const enterTestingModeMutation = useMutation({
    mutationFn: async () => {
      try {
        // Set testing mode flag first, in case server call fails
        localStorage.setItem('testingMode', 'true');
        
        // Clear existing auth 
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenExpiry');
        
        // Optional: try to call the server endpoint, but don't depend on it
        try {
          await apiRequest("POST", "/api/auth/testing-mode");
        } catch (err) {
          console.log("Testing mode server notification failed, but continuing anyway");
        }
        
        // Simple object to return
        return { success: true };
      } finally {
        // Force a page reload to clear all state no matter what
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    },
    onSuccess: () => {
      toast({
        title: "Testing Mode Activated",
        description: "You are now in testing mode. No changes will be saved to the database.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Testing Mode Failed",
        description: error.message || "Could not enable testing mode",
        variant: "destructive",
      });
    },
  });

  // Determine if we're in testing mode
  const isTestingMode = Boolean(
    (configData?.testingMode) || 
    (localStorage.getItem('testingMode') === 'true')
  );

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isTestingMode,
        loginMutation,
        logoutMutation,
        registerMutation,
        enterTestingModeMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
