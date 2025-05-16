import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

export default function AutoLogin() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dev/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Auto-login successful:', data);
        
        // Update the user in the cache
        queryClient.setQueryData(['/api/user'], data.user);
        
        // Show success message
        toast({
          title: 'Logged in as Kate',
          description: 'You have been automatically logged in',
        });
        
        // Reload to make sure everything is updated
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      toast({
        title: 'Auto-login failed',
        description: error instanceof Error ? error.message : 'Could not log in',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleLogin} 
      disabled={loading}
      variant="secondary"
      className="mt-4"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logging in...
        </>
      ) : (
        "Auto Login as Kate"
      )}
    </Button>
  );
}