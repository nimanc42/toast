import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ReflectionReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: number | null;
  noteContent: string;
  autoPlayAudio?: boolean;
}

export default function ReflectionReviewDialog({ 
  isOpen, 
  onClose, 
  noteId, 
  noteContent,
  autoPlayAudio = false
}: ReflectionReviewDialogProps) {
  const [reviewContent, setReviewContent] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state when the dialog opens or closes
  useEffect(() => {
    if (!isOpen) {
      setReviewContent("");
      setAudioUrl(null);
      setIsPlayingAudio(false);
    }
  }, [isOpen]);

  // Get review mutation
  const reviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/notes/${id}/review`);
      const data = await res.json();
      return data.review;
    },
    onSuccess: (data) => {
      setReviewContent(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Text-to-speech mutation
  const ttsMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/tts/review", { text });
      const data = await res.json();
      
      // If it's a Supabase URL, create a proxy URL to avoid CORS issues
      let audioUrl = data.audioUrl;
      if (audioUrl && audioUrl.includes('supabase.co/storage')) {
        audioUrl = `/api/audio/proxy?url=${encodeURIComponent(audioUrl)}`;
      }
      
      return audioUrl;
    },
    onSuccess: (url) => {
      console.log("TTS audio URL received:", url);
      setAudioUrl(url);
      // Don't auto-play - let user click the button
      // Audio will be available via the Read Aloud button
    },
    onError: (error: Error) => {
      toast({
        title: "Voice generation failed",
        description: "Unable to generate voice for this review. Please try again.",
        variant: "destructive",
      });
      setIsPlayingAudio(false);
    }
  });

  // Function to play audio - user-initiated only
  const playAudio = async (url: string) => {
    console.log("=== AUDIO PLAYBACK DEBUG ===");
    console.log("User initiated audio playback from URL:", url);
    console.log("URL type:", typeof url);
    console.log("URL length:", url?.length);
    
    if (!url) {
      console.error("No audio URL provided");
      toast({
        title: "No audio available",
        description: "Audio file not found. Please try generating again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Remove any existing audio element
      const existingAudio = document.getElementById("reviewAudio");
      if (existingAudio) {
        console.log("Removing existing audio element");
        existingAudio.remove();
      }
      
      // Create a fresh audio element
      console.log("Creating new audio element");
      const audioElement = new Audio();
      audioElement.id = "reviewAudio";
      audioElement.preload = "auto";
      audioElement.crossOrigin = "anonymous";
      
      console.log("Setting up event listeners");
      
      // Set up event listeners
      audioElement.onended = () => {
        console.log("Audio playback ended");
        setIsPlayingAudio(false);
      };
      
      audioElement.onerror = (e) => {
        console.error("Audio error event:", e);
        console.error("Audio element error details:", audioElement.error);
        console.error("Audio element network state:", audioElement.networkState);
        console.error("Audio element ready state:", audioElement.readyState);
        console.error("Audio element src:", audioElement.src);
        setIsPlayingAudio(false);
        
        toast({
          title: "Audio playback error",
          description: "There was an error playing the audio file. Please try again.",
          variant: "destructive",
        });
      };
      
      audioElement.onloadstart = () => {
        console.log("Audio load started");
      };
      
      audioElement.oncanplay = () => {
        console.log("Audio can play");
      };
      
      audioElement.oncanplaythrough = () => {
        console.log("Audio can play through");
      };
      
      // Set the source
      console.log("Setting audio source to:", url);
      audioElement.src = url;
      
      // Try to play the audio immediately (user-initiated)
      console.log("Attempting to play audio...");
      await audioElement.play();
      console.log("Audio playback started successfully");
      setIsPlayingAudio(true);
      
    } catch (error: any) {
      console.error("=== AUDIO PLAYBACK ERROR ===");
      console.error("Audio play failed:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      setIsPlayingAudio(false);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Permission needed",
          description: "Please click the play button again to allow audio playback.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Playback failed",
          description: `Audio playback failed: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  // Handle reading the review aloud
  const handleReadAloud = () => {
    console.log("=== HANDLE READ ALOUD ===");
    console.log("isPlayingAudio:", isPlayingAudio);
    console.log("audioUrl:", audioUrl);
    console.log("reviewContent:", reviewContent);
    console.log("ttsMutation.isPending:", ttsMutation.isPending);
    
    if (isPlayingAudio && audioUrl) {
      // Stop the current audio if playing
      console.log("Stopping current audio");
      const audioElement = document.getElementById("reviewAudio") as HTMLAudioElement;
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setIsPlayingAudio(false);
    } else if (audioUrl) {
      // Play existing audio if available
      console.log("Playing existing audio");
      playAudio(audioUrl);
    } else if (reviewContent && !ttsMutation.isPending) {
      // Generate new audio if no audio is available and not already requesting
      console.log("Generating new audio");
      ttsMutation.mutate(reviewContent);
    }
  };

  // Load the review when the dialog opens
  useEffect(() => {
    if (isOpen && noteId) {
      reviewMutation.mutate(noteId);
    }
  }, [isOpen, noteId]);
  
  // Generate audio when review content is available and autoPlayAudio is true
  useEffect(() => {
    let autoPlayTimeout: NodeJS.Timeout | null = null;
    
    if (autoPlayAudio && reviewContent && !isPlayingAudio && !ttsMutation.isPending && !audioUrl) {
      // Add a small delay to prevent rapid requests
      autoPlayTimeout = setTimeout(() => {
        // Generate audio but don't auto-play (browser requires user interaction)
        ttsMutation.mutate(reviewContent);
      }, 500);
    }
    
    // Clean up timeout if component unmounts or dependencies change
    return () => {
      if (autoPlayTimeout) {
        clearTimeout(autoPlayTimeout);
      }
    };
  }, [autoPlayAudio, reviewContent, isPlayingAudio, ttsMutation.isPending, audioUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-700">I hear you saying...</DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          {!reviewContent && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleReadAloud}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            disabled={ttsMutation.isPending || !reviewContent}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Stop Audio
              </>
            ) : ttsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Read Aloud
              </>
            )}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}