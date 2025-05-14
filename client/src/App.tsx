import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import WeeklyToastPage from "@/pages/weekly-toast-page";
import SettingsPage from "@/pages/settings-page";
import NotFound from "@/pages/not-found";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import MobileHeader from "@/components/mobile-header";

// Animation variants for page transitions
const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -10,
  },
};

// Animation transition settings
const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.3,
};

function Router() {
  const [location] = useLocation();
  
  return (
    <div className="mobile-app-container min-h-screen flex flex-col">
      {/* Only show header on protected routes */}
      {location !== "/auth" && <MobileHeader />}
      
      {/* Main content with animations */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="h-full w-full"
          >
            <Switch>
              <ProtectedRoute path="/" component={HomePage} />
              <ProtectedRoute path="/weekly-toast" component={WeeklyToastPage} />
              <ProtectedRoute path="/settings" component={SettingsPage} />
              <Route path="/auth" component={AuthPage} />
              <Route component={NotFound} />
            </Switch>
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Only show bottom nav on protected routes */}
      {location !== "/auth" && <MobileBottomNav />}
    </div>
  );
}

function App() {
  const [isReady, setIsReady] = useState(false);
  
  // Simulate splash screen effect with a small delay
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Apply any iOS specific fixes
  useEffect(() => {
    // Fix for iOS vh issue (100vh is too tall on iOS)
    const setVhProperty = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVhProperty();
    window.addEventListener('resize', setVhProperty);
    
    return () => window.removeEventListener('resize', setVhProperty);
  }, []);
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-white text-2xl font-bold"
        >
          A Toast to You
        </motion.div>
      </div>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
