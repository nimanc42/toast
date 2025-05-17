import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { TestingModeBanner } from "@/components/testing-mode-banner";
// WebSocket temporarily disabled
// import { WebSocketProvider } from "@/hooks/websocket-provider";
import { NewBadgeNotification } from "@/components/new-badge-notification";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import AuthCallback from "@/pages/auth-callback";
import WeeklyToastPage from "@/pages/weekly-toast-page";
import SettingsPage from "@/pages/settings-page";
import SharedToastPage from "@/pages/shared-toast-page";
import AnalyticsPage from "@/pages/analytics-page";
import NotFound from "@/pages/not-found";
import VerifyEmailPage from "@/pages/verify-email-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResendVerificationPage from "@/pages/resend-verification-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/weekly-toast" component={WeeklyToastPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/resend-verification" component={ResendVerificationPage} />
      <Route path="/shared/:code" component={SharedToastPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* WebSocket temporarily disabled */}
        <TooltipProvider>
          <Toaster />
          <NewBadgeNotification />
          <TestingModeBanner />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
