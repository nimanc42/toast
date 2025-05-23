import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Play, Volume2 } from "lucide-react";
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

// Voice sample data
const VOICE_OPTIONS = [
  { id: 'david', name: 'David', description: 'Clear and professional male voice' },
  { id: 'ranger', name: 'Ranger', description: 'Deep, authoritative male voice' },
  { id: 'grandpa', name: 'Grandpa', description: 'Warm, friendly elderly male voice' },
  { id: 'sam', name: 'Sam', description: 'Mature male voice with character' },
  { id: 'giovanni', name: 'Giovanni', description: 'Italian-accented male voice' },
  { id: 'amelia', name: 'Amelia', description: 'Young female voice with energy' },
  { id: 'maeve', name: 'Maeve', description: 'Mature female voice with warmth' },
  { id: 'rachel', name: 'Rachel', description: 'Clear and articulate female voice' },
];

export default function OnboardingModal({ isOpen, onClose, user }: OnboardingModalProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

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
      const res = await apiRequest("PUT", "/api/preferences", data);
      const preferenceData = await res.json();
      return preferenceData;
    },
    onSuccess: () => {
      // Update firstLogin status to false
      completeOnboardingMutation.mutate();
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
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
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

  // Play voice sample
  const playVoiceSample = () => {
    if (!selectedVoice) return;
    
    if (isPlaying && audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    if (audioElement) {
      // Set the source to the voice sample MP3
      audioElement.src = `/voice-samples/${selectedVoice}.mp3`;
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
  };

  // Handle continuing to the app
  const handleContinue = () => {
    if (!selectedVoice) {
      toast({
        title: "Voice selection required",
        description: "Please select a voice before continuing.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({ voiceStyle: selectedVoice });
  };

  // Don't show the modal for returning users
  if (user && !user.firstLogin) {
    return null;
  }

  const isPending = saveMutation.isPending || completeOnboardingMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
                {VOICE_OPTIONS.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name} - {voice.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={playVoiceSample}
              disabled={!selectedVoice || isPending}
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
  );
}