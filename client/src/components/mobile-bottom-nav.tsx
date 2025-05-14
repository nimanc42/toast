import { Home, Calendar, User, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DailyNoteModal from "@/components/daily-note-modal";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: Home,
    },
    {
      name: "Weekly",
      href: "/weekly-toast",
      icon: Calendar,
    },
    {
      name: "", // No name for the center add button
      href: "#",
      icon: Plus,
      isMainAction: true,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: User,
    },
  ];
  
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-bottom">
        <div className="container h-full mx-auto flex items-center justify-around">
          {navItems.map((item) => (
            item.isMainAction ? (
              <button 
                key={item.name}
                className="relative flex flex-col items-center justify-center w-14 h-14 -mt-8 rounded-full bg-primary text-primary-foreground shadow-lg no-tap-highlight" 
                aria-label="Add Note"
                onClick={() => setIsNoteModalOpen(true)}
              >
                <item.icon className="h-6 w-6" />
              </button>
            ) : (
              <Link 
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-full text-xs no-tap-highlight",
                  location === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span>{item.name}</span>
              </Link>
            )
          ))}
        </div>
      </nav>
      
      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DailyNoteModal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}