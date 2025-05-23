import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import OnboardingModal from "./onboarding-modal";

/**
 * Controller component that manages showing the onboarding modal
 * for first-time users
 */
export default function OnboardingController(): JSX.Element {
  const { user, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check if we should show the onboarding modal when the user data loads
  useEffect(() => {
    if (!isLoading && user && user.firstLogin) {
      setShowOnboarding(true);
    }
  }, [user, isLoading]);
  
  // Handler for closing the modal
  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };
  
  return (
    <OnboardingModal 
      isOpen={showOnboarding} 
      onClose={handleCloseOnboarding} 
      user={user}
    />
  );
}