import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MobileHeader() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Determine the title based on the current route
  const getTitle = () => {
    switch(location) {
      case "/":
        return "Daily Notes";
      case "/weekly-toast":
        return "Weekly Toast";
      case "/settings":
        return "Settings";
      default:
        return "A Toast to You";
    }
  };
  
  return (
    <header className="bg-background sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-top">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between">
          {/* Left side - User avatar or logo */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt={user?.name || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="font-semibold">{getTitle()}</div>
          </div>
          
          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full",
                location === "/notifications" && "bg-accent"
              )}
            >
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full",
                location === "/settings" && "bg-accent"
              )}
              onClick={() => location !== "/settings" && (window.location.href = "/settings")}
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}