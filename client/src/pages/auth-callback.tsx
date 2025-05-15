import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

/**
 * This page handles the callback after social authentication
 * It exchanges the code for a session with Supabase,
 * then validates and creates/updates user in our database
 */
export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [isMatch] = useRoute("/auth/callback");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isMatch) return;

    const handleAuthCallback = async () => {
      try {
        // Get session from URL
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          console.error("No session found");
          setError("Authentication failed. Please try again.");
          return;
        }

        // Get user info
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!userData.user) {
          console.error("No user found");
          setError("Authentication failed. No user data found.");
          return;
        }

        // Extract user data
        const { id: supabaseId, email, user_metadata } = userData.user;
        const name = user_metadata?.full_name || user_metadata?.name || '';
        
        try {
          // Find or create user in our database
          const token = data.session.access_token;
          
          // Call our backend API to handle user creation/update
          const response = await fetch('/api/auth/social-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Supabase-Auth': token
            },
            body: JSON.stringify({
              supabaseId,
              email,
              name,
              provider: user_metadata?.provider || 'unknown'
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to authenticate: ${response.status}`);
          }

          const user = await response.json();
          
          // Set auth cookie
          document.cookie = `authToken=${user.token}; path=/; max-age=604800; SameSite=Lax`;
          localStorage.setItem('authToken', user.token);

          // Update auth state
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          
          // Show success message
          toast({
            title: "Authentication successful!",
            description: `Welcome, ${user.name || 'User'}!`,
          });

          // Redirect to home page
          setLocation("/");
        } catch (apiError) {
          console.error("API error:", apiError);
          setError("Failed to authenticate with server. Please try again.");
        }
      } catch (e) {
        console.error("Auth callback error:", e);
        setError("Authentication failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [isMatch, setLocation, toast]);

  if (!isMatch) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 mx-auto animate-spin mb-4 text-primary-600" />
            <h1 className="text-2xl font-semibold mb-2">Authenticating...</h1>
            <p className="text-gray-600">Please wait while we complete your sign-in.</p>
          </>
        ) : error ? (
          <>
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
              <h1 className="text-xl font-semibold mb-2">Authentication Error</h1>
              <p>{error}</p>
            </div>
            <button
              onClick={() => setLocation("/auth")}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
              <h1 className="text-xl font-semibold mb-2">Authentication Successful</h1>
              <p>You are now signed in. Redirecting...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}