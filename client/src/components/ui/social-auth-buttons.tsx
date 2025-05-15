import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { FaGoogle, FaApple } from "react-icons/fa";
import { signInWithGoogle, signInWithApple } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface SocialAuthButtonsProps {
  onAuthStart?: () => void;
  onAuthError?: (error: Error) => void;
}

export function SocialAuthButtons({ onAuthStart, onAuthError }: SocialAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const { toast } = useToast();

  // Check if Supabase is configured with credentials
  useEffect(() => {
    const hasSupabaseCredentials = !!(
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    
    setIsConfigured(hasSupabaseCredentials);
    
    if (!hasSupabaseCredentials) {
      console.warn('Supabase credentials missing. Social authentication will be disabled.');
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      if (onAuthStart) onAuthStart();
      
      // Check configuration before attempting sign-in
      if (!isConfigured) {
        throw new Error('Supabase credentials not configured. Social authentication is unavailable.');
      }
      
      await signInWithGoogle();
      // No need to handle success here because the page will redirect
    } catch (error) {
      console.error('Google auth error:', error);
      
      // Provide a more specific error message for configuration issues
      const errorMessage = !isConfigured
        ? "Social authentication is not configured. Please contact the administrator."
        : "Could not sign in with Google. Please try again.";
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (onAuthError && error instanceof Error) onAuthError(error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsAppleLoading(true);
      if (onAuthStart) onAuthStart();
      
      // Check configuration before attempting sign-in
      if (!isConfigured) {
        throw new Error('Supabase credentials not configured. Social authentication is unavailable.');
      }
      
      await signInWithApple();
      // No need to handle success here because the page will redirect
    } catch (error) {
      console.error('Apple auth error:', error);
      
      // Provide a more specific error message for configuration issues
      const errorMessage = !isConfigured
        ? "Social authentication is not configured. Please contact the administrator."
        : "Could not sign in with Apple. Please try again.";
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
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
      
      {!isConfigured && (
        <div className="flex items-center p-3 mb-2 text-sm rounded-md bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>Social login is not configured. Contact the administrator.</span>
        </div>
      )}
      
      <Button
        variant="outline"
        type="button"
        disabled={isGoogleLoading || isAppleLoading || !isConfigured}
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
      
      <Button
        variant="outline"
        type="button"
        disabled={isGoogleLoading || isAppleLoading || !isConfigured}
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
    </div>
  );
}