import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [_, navigate] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/auth");
      }
    });
  };
  
  // Get user's initials for avatar
  const getInitials = () => {
    if (!user?.name) return "?";
    return user.name.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-600 font-accent flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="#FFF8E1" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Toast shape with more toast-like appearance */}
                  <path d="M4,6 C4,6 3,12 5,16 C7,20 9,21 12,21 C15,21 17,20 19,16 C21,12 20,6 20,6 L4,6 Z" stroke="#3b82f6" fill="#FFF8E1" />
                  {/* Slightly wavy top to look like toast */}
                  <path d="M4,6 C4,4 8,3 12,3 C16,3 20,4 20,6" />
                  {/* Toast texture lines */}
                  <path d="M7,9 L9,9" stroke="#3b82f6" strokeWidth="0.75" opacity="0.7" />
                  <path d="M12,8 L16,8" stroke="#3b82f6" strokeWidth="0.75" opacity="0.7" />
                  <path d="M8,12 L14,12" stroke="#3b82f6" strokeWidth="0.75" opacity="0.7" />
                  {/* Smiley face with blue eyes and smile */}
                  <circle cx="9" cy="14" r="1" fill="#3b82f6" />
                  <circle cx="15" cy="14" r="1" fill="#3b82f6" />
                  <path d="M9,17 C10,18.5 14,18.5 15,17" stroke="#3b82f6" fill="none" />
                </svg>
                A Toast to You
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:items-center">
              <Link href="/" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/weekly-toast" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                Weekly Toast
              </Link>
              <Link href="/analytics" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                Analytics
              </Link>
              <Link href="/settings" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <div className="ml-3 relative">
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <span className="sr-only">Open user menu</span>
                    <Avatar className="h-8 w-8 bg-secondary-200">
                      <AvatarFallback className="text-secondary-700 font-medium text-sm">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-4 py-2 text-sm text-gray-900 border-b">
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-gray-500 truncate">{user?.email}</div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/analytics" className="w-full">
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="w-full">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      "Sign out"
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
