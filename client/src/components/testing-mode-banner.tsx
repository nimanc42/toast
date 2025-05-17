import { useAuth } from "@/hooks/use-auth";
import { FlaskConical } from "lucide-react";

export function TestingModeBanner() {
  const { isTestingMode } = useAuth();
  
  if (!isTestingMode) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-950 py-1 px-4 z-50 flex items-center justify-center shadow-md">
      <FlaskConical className="w-4 h-4 mr-2" />
      <span className="font-medium text-sm">
        Testing Mode: No data will be saved to the database
      </span>
    </div>
  );
}