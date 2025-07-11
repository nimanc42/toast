import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { FaGoogle, FaApple } from "react-icons/fa";
import { signInWithApple } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface SocialAuthButtonsProps {
  onAuthStart?: () => void;
  onAuthError?: (error: Error) => void;
}

export function SocialAuthButtons({ onAuthStart, onAuthError }: SocialAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(false);
  const { toast } = useToast();

  // Check if Supabase is configured
  const supabaseReady = !!(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  
  // Check if Google OAuth is configured
  useEffect(() => {
    fetch('/api/auth/google/status')
      .then(response => response.json())
      .then(data => {
        setIsGoogleConfigured(data.configured);
      })
      .catch(error => {
        console.warn('Failed to check Google auth status:', error);
        setIsGoogleConfigured(false);
      });
  }, []);

  // If no auth methods are available, show a warning
  if (!supabaseReady && !isGoogleConfigured) {
    return (
      <div className="flex flex-col space-y-4 w-full">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        <div className="mt-4 rounded-md bg-yellow-100 p-3 text-sm text-yellow-800">
          Social login is not configured. Contact the administrator.
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = () => {
    try {
      setIsGoogleLoading(true);
      if (onAuthStart) onAuthStart();
      
      // This uses the server-side passport flow
      window.location.href = '/api/auth/google';
      
    } catch (error) {
      console.error('Google auth redirect error:', error);
      
      toast({
        title: "Authentication failed",
        description: "Could not redirect to Google login. Please try again.",
        variant: "destructive",
      });
      
      if (onAuthError && error instanceof Error) onAuthError(error);
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsAppleLoading(true);
      if (onAuthStart) onAuthStart();
      
      await signInWithApple();
      // No need to handle success here because the page will redirect
    } catch (error) {
      console.error('Apple auth error:', error);
      
      toast({
        title: "Authentication failed",
        description: "Could not sign in with Apple. Please try again.",
        variant: "destructive",
      });
      
      if (onAuthError && error instanceof Error) onAuthError(error);
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        {isGoogleConfigured && (
          <Button
            variant="outline"
            type="button"
            disabled={isGoogleLoading}
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-black hover:bg-gray-100 border-gray-300"
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FaGoogle className="mr-2 h-4 w-4 text-red-500" />
            )}
            Sign in with Google
          </Button>
        )}
        
        {supabaseReady && (
          <Button
            variant="outline"
            type="button"
            disabled={isAppleLoading}
            onClick={handleAppleSignIn}
            className="w-full bg-black text-white hover:bg-gray-900 border-black"
          >
            {isAppleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FaApple className="mr-2 h-4 w-4" />
            )}
            Sign in with Apple
          </Button>
        )}
      </div>
    </div>
  );
}