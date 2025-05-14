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
  loginMutation: UseMutationResult<LoginResponse, Error, LoginUser>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<RegisterResponse, Error, z.infer<typeof insertUserSchema>>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Check for token in localStorage on initial render
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    console.log('Auth token found in localStorage:', !!token);
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<Omit<User, "password"> | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (response: LoginResponse) => {
      // Store the JWT token in localStorage
      localStorage.setItem('authToken', response.token);
      
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], response.user);
      
      toast({
        title: "Welcome back!",
        description: `You've successfully logged in.`,
      });
    },
    onError: (error: Error) => {
      // Clear any existing token on login failure
      localStorage.removeItem('authToken');
      
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
      
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], response.user);
      
      toast({
        title: "Registration successful!",
        description: "Your account has been created.",
      });
    },
    onError: (error: Error) => {
      // Clear any existing token on registration failure
      localStorage.removeItem('authToken');
      
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
      // Clear the JWT token from localStorage
      localStorage.removeItem('authToken');
      
      // Clear the user data from query cache
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
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
