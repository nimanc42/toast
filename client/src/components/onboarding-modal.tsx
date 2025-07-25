import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Play, Volume2 } from "lucide-react";
import PrivacyAcknowledgementModal from "./privacy-acknowledgement-modal";
// Using the same user type from auth context
type UserType = {
  id: number;
  username: string;
  name: string;
  email: string;
  verified: boolean;
  externalId?: string | null;
  externalProvider?: string | null;
  weeklyToastDay?: number | null;
  timezone?: string | null;
  firstLogin: boolean;
  createdAt: Date;
};

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  sampleUrl: string;
}

export default function OnboardingModal({ isOpen, onClose, user }: OnboardingModalProps): JSX.Element {
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch available voices from API
  const { data: voices, isLoading: voicesLoading } = useQuery<VoiceOption[]>({
    queryKey: ["/api/voices"]
  });

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      toast({
        title: "Audio Error",
        description: "Could not play the voice sample. Please try again.",
        variant: "destructive",
      });
    };
    setAudioElement(audio);

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [toast]);

  // Save voice preference mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { voiceStyle: string }) => {
      // Include all required fields from the voice preference schema
      const res = await apiRequest("PUT", "/api/preferences", {
        voiceStyle: data.voiceStyle,
        toastDay: "Sunday", // Default values
        toastTone: "auto",
        dailyReminder: true,
        toastNotification: true,
        emailNotifications: false
      });
      const preferenceData = await res.json();
      return preferenceData;
    },
    onSuccess: () => {
      // Show privacy modal after voice preference is saved
      setShowPrivacyModal(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save voice preference",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete onboarding mutation (sets firstLogin to false)
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/complete-onboarding");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to A Toast To You!",
        description: "Your voice preference has been saved. Enjoy your journey!",
      });
      // Make sure we refresh the user data so voice preference is up-to-date
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error completing setup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle privacy acknowledgement
  const handlePrivacyAcknowledgement = () => {
    // Complete the onboarding process
    completeOnboardingMutation.mutate();
  };

  // Play voice sample
  const playVoiceSample = () => {
    if (!selectedVoice || !voices) return;
    
    if (isPlaying && audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    if (audioElement) {
      // Find the voice in our options to get the correct sample URL
      const selectedVoiceObj = voices.find((v: VoiceOption) => v.id === selectedVoice);
      if (selectedVoiceObj) {
        // Set the source to the voice sample URL
        audioElement.src = selectedVoiceObj.sampleUrl;
        audioElement.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(err => {
            console.error("Error playing sample:", err);
            toast({
              title: "Could not play sample",
              description: "There was an error playing the voice sample. Please try again.",
              variant: "destructive",
            });
          });
      }
    }
  };

  // Handle continuing to the app
  const handleContinue = async () => {
    if (!selectedVoice) {
      toast({
        title: "Voice selection required",
        description: "Please select a voice before continuing.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First save the voice preference
      await saveMutation.mutateAsync({ voiceStyle: selectedVoice });
      
      // Note: The onboarding completion and user data refresh is handled
      // in the saveMutation.onSuccess callback
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error saving preferences",
        description: "There was a problem saving your voice preference. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Don't show the modal for returning users
  if (user && !user.firstLogin) {
    return <></>;
  }

  const isPending = saveMutation.isPending || completeOnboardingMutation.isPending;

  return (
    <>
      <Dialog open={isOpen && !showPrivacyModal} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome to A Toast To You!</DialogTitle>
            <DialogDescription>
              Select a voice that will be used to read your weekly reflections and reviews.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="voice-select" className="text-sm font-medium text-gray-700">
                Choose Your Voice
              </label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger id="voice-select" className="w-full">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices?.map((voice: VoiceOption) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={playVoiceSample}
                disabled={!selectedVoice || saveMutation.isPending || voicesLoading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isPlaying ? (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Stop Preview
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Preview Voice
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              You can change your voice choice at any time in your dashboard.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleContinue}
              disabled={!selectedVoice || isPending} 
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <PrivacyAcknowledgementModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAcknowledge={handlePrivacyAcknowledgement}
      />
    </>
  );
}