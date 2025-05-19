import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

export function TestingModeBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Query to check if testing mode is enabled
  const { data: configStatus } = useQuery({
    queryKey: ['/api/config/status'],
    staleTime: 60000, // 1 minute
  });
  
  // Check if testing mode is enabled either via server or local storage
  const isTestingMode = Boolean(
    localStorage.getItem('testingMode') === 'true' ||
    (configStatus && 
     typeof configStatus === 'object' && 
     Object.prototype.hasOwnProperty.call(configStatus, 'testingMode') && 
     configStatus.testingMode)
  );
  
  // Don't show anything if not in testing mode or if dismissed
  if (!isTestingMode || isDismissed) {
    return null;
  }
  
  return (
    <Alert className="sticky top-0 z-50 bg-yellow-50 border-yellow-300 shadow-md">
      <div className="flex justify-between items-center">
        <AlertDescription className="text-yellow-800 font-medium">
          🧪 Testing Mode Active - No changes will be saved to the database
        </AlertDescription>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-yellow-700 hover:text-yellow-900"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </Alert>
  );
}