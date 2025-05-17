import { useAuth } from "@/hooks/use-auth";
import { FlaskConical, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function TestingModeBanner() {
  const { isTestingMode, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  if (!isTestingMode) return null;
  
  const exitTestingMode = async () => {
    try {
      // First clear the testing mode flag in local storage
      localStorage.removeItem('testingMode');
      
      // Then perform a logout to clear the session
      logoutMutation.mutate(undefined, {
        onSuccess: () => {
          toast({
            title: "Testing Mode Disabled",
            description: "You've exited Testing Mode. App will now use the regular database.",
            variant: "default",
          });
          
          // Refresh the page to ensure a clean state
          setTimeout(() => {
            window.location.href = '/auth';
          }, 1000);
        },
        onError: (error) => {
          toast({
            title: "Error Disabling Testing Mode",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Error exiting testing mode:", error);
      toast({
        title: "Error",
        description: "Failed to exit Testing Mode. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500/80 text-yellow-950 py-1 px-4 z-40 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <FlaskConical className="w-4 h-4 mr-2" />
        <span className="font-medium text-sm">
          Testing Mode: No data is being saved to the database
        </span>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-700 ml-4"
        onClick={exitTestingMode}
      >
        <XCircle className="w-3 h-3 mr-1" />
        Exit Testing Mode
      </Button>
    </div>
  );
}