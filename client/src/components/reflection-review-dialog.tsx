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
      return data.audioUrl;
    },
    onSuccess: (url) => {
      console.log("TTS audio URL received:", url);
      setAudioUrl(url);
      // Don't auto-play immediately, let user control playback
      if (autoPlayAudio) {
        setTimeout(() => playAudio(url), 100);
      }
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

  // Function to play audio
  const playAudio = async (url: string) => {
    console.log("Attempting to play audio from URL:", url);
    
    // Create or get the audio element
    let audioElement = document.getElementById("reviewAudio") as HTMLAudioElement;
    
    if (!audioElement) {
      audioElement = document.createElement("audio");
      audioElement.id = "reviewAudio";
      audioElement.style.display = "none";
      document.body.appendChild(audioElement);
      
      // Set up event listeners once
      audioElement.onended = () => {
        console.log("Audio playback ended");
        setIsPlayingAudio(false);
      };
      
      audioElement.onerror = (e) => {
        console.error("Audio element error event:", e);
        console.error("Network state:", audioElement.networkState);
        console.error("Ready state:", audioElement.readyState);
        console.error("Error details:", audioElement.error);
        console.error("Audio src:", audioElement.src);
        
        // Only show error for actual media errors, not network loading issues
        if (audioElement.error) {
          const errorCode = audioElement.error.code;
          const errorMessage = audioElement.error.message;
          
          console.error("Media error code:", errorCode);
          console.error("Media error message:", errorMessage);
          
          setIsPlayingAudio(false);
          
          // Don't show toast for MEDIA_ERR_ABORTED (user cancelled)
          if (errorCode !== 1) {
            toast({
              title: "Audio playback error",
              description: "There was an error playing the audio file. Please try again.",
              variant: "destructive",
            });
          }
        }
      };
      
      audioElement.onloadstart = () => {
        console.log("Audio load started");
      };
      
      audioElement.oncanplay = () => {
        console.log("Audio can play");
      };
    }
    
    // Set source and load
    audioElement.src = url;
    audioElement.load(); // Force reload
    
    // Wait for the audio to be ready before playing
    const playWhenReady = () => {
      return new Promise<void>((resolve, reject) => {
        const attemptPlay = async () => {
          try {
            console.log("Attempting to play audio, ready state:", audioElement.readyState);
            await audioElement.play();
            setIsPlayingAudio(true);
            console.log("Audio playback started successfully");
            resolve();
          } catch (error: any) {
            console.error("Audio play error:", error);
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
                description: "Audio playback failed. Please try again.",
                variant: "destructive",
              });
            }
            reject(error);
          }
        };
        
        // If audio is ready, play immediately
        if (audioElement.readyState >= 2) {
          attemptPlay();
        } else {
          // Wait for canplay event
          const onCanPlay = () => {
            audioElement.removeEventListener('canplay', onCanPlay);
            audioElement.removeEventListener('error', onError);
            attemptPlay();
          };
          
          const onError = (e: Event) => {
            audioElement.removeEventListener('canplay', onCanPlay);
            audioElement.removeEventListener('error', onError);
            console.error("Audio load error:", e);
            reject(new Error("Audio failed to load"));
          };
          
          audioElement.addEventListener('canplay', onCanPlay);
          audioElement.addEventListener('error', onError);
        }
      });
    };
    
    try {
      await playWhenReady();
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  };

  // Handle reading the review aloud
  const handleReadAloud = () => {
    if (isPlayingAudio && audioUrl) {
      // Stop the current audio if playing
      const audioElement = document.getElementById("reviewAudio") as HTMLAudioElement;
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setIsPlayingAudio(false);
    } else if (audioUrl) {
      // Play existing audio if available
      playAudio(audioUrl);
    } else if (reviewContent && !ttsMutation.isPending) {
      // Generate new audio if no audio is available and not already requesting
      ttsMutation.mutate(reviewContent);
    }
  };

  // Load the review when the dialog opens
  useEffect(() => {
    if (isOpen && noteId) {
      reviewMutation.mutate(noteId);
    }
  }, [isOpen, noteId]);
  
  // Automatically play audio when review content is available and autoPlayAudio is true
  useEffect(() => {
    let autoPlayTimeout: NodeJS.Timeout | null = null;
    
    if (autoPlayAudio && reviewContent && !isPlayingAudio && !ttsMutation.isPending && !audioUrl) {
      // Add a small delay to prevent rapid requests
      autoPlayTimeout = setTimeout(() => {
        // Generate and play the audio
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