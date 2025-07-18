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
  // Store cached audio URLs to prevent regeneration
  const [cachedAudioUrls, setCachedAudioUrls] = useState<Map<string, string>>(new Map());

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
      // Create a cache key based on the text content
      const cacheKey = btoa(text).substring(0, 32); // Use base64 encoded text as cache key

      // Check if we already have cached audio for this text
      const cachedUrl = cachedAudioUrls.get(cacheKey);
      if (cachedUrl) {
        console.log("Using cached audio URL for review");
        return cachedUrl;
      }

      console.log("Generating new TTS audio for review");
      const res = await apiRequest("POST", "/api/tts/review", { text });
      const data = await res.json();
      const audioUrl = data.audioUrl;
      // Cache the generated audio URL
      setCachedAudioUrls(prev => new Map(prev.set(cacheKey, audioUrl)));

      return audioUrl;
    },
    onSuccess: (url) => {
      setAudioUrl(url);
      playAudio(url);
    },
    onError: (error: Error) => {
      console.error("TTS error:", error);

      // Handle rate limit errors specifically
      if (error.message.includes("limit reached")) {
        toast({
          title: "Audio not available",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Voice generation failed",
          description: "Unable to generate voice for this review. Please try again.",
          variant: "destructive",
        });
      }
      setIsPlayingAudio(false);
    }
  });

  // Function to play audio with the review content
  const playAudio = (url: string) => {
    console.log("Attempting to play audio from URL:", url);

    // Validate URL first
    if (!url || typeof url !== 'string') {
      console.error("Invalid audio URL provided:", url);
      toast({
        title: "Audio playback failed",
        description: "Invalid audio URL received.",
        variant: "destructive",
      });
      setIsPlayingAudio(false);
      return;
    }

    // Create or get the audio element
    let audioElement = document.getElementById("reviewAudio") as HTMLAudioElement;

    if (!audioElement) {
      audioElement = document.createElement("audio");
      audioElement.id = "reviewAudio";
      audioElement.style.display = "none";
      audioElement.preload = "metadata";
      audioElement.crossOrigin = "anonymous"; // Handle CORS if needed
      document.body.appendChild(audioElement);
      console.log("Created new audio element");
    }

    // Clean up any existing playback
    try {
      audioElement.pause();
      audioElement.currentTime = 0;
    } catch (e) {
      console.warn("Error stopping previous audio:", e);
    }

    // Clean up previous event listeners to avoid memory leaks
    audioElement.onended = null;
    audioElement.onerror = null;
    audioElement.onloadstart = null;
    audioElement.oncanplay = null;
    audioElement.onloadeddata = null;

    // Set up event listeners
    audioElement.onended = () => {
      console.log("Audio playback ended");
      setIsPlayingAudio(false);
    };

    audioElement.onloadstart = () => {
      console.log("Audio loading started for URL:", url);
    };

    audioElement.onloadeddata = () => {
      console.log("Audio data loaded successfully");
    };

    audioElement.oncanplay = () => {
      console.log("Audio ready to play");
    };

    audioElement.onerror = (e) => {
      console.error("Audio error event:", e);
      const error = audioElement.error;
      setIsPlayingAudio(false);

      if (error) {
        console.error("MediaError details:", {
          code: error.code,
          message: error.message,
          MEDIA_ERR_ABORTED: MediaError.MEDIA_ERR_ABORTED,
          MEDIA_ERR_NETWORK: MediaError.MEDIA_ERR_NETWORK,
          MEDIA_ERR_DECODE: MediaError.MEDIA_ERR_DECODE,
          MEDIA_ERR_SRC_NOT_SUPPORTED: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        });

        let errorMessage = "Audio playback failed";

        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            console.log("Audio playback aborted by user");
            return; // Don't show error for user-initiated stops
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Network error while loading audio. Please check your connection.";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "Audio format could not be decoded.";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Audio source format not supported by your browser.";
            break;
          default:
            errorMessage = `Audio error (code: ${error.code})`;
        }

        toast({
          title: "Audio playback error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Audio playback error",
          description: "Unknown audio error occurred.",
          variant: "destructive",
        });
      }
    };

    // Set source and load
    console.log("Setting audio source to:", url);
    audioElement.src = url;

    // Force reload the audio element
    try {
      audioElement.load();
    } catch (e) {
      console.error("Error loading audio:", e);
      toast({
        title: "Audio loading failed",
        description: "Could not load the audio file.",
        variant: "destructive",
      });
      setIsPlayingAudio(false);
      return;
    }

    // Small delay to ensure audio is ready, then attempt to play
    setTimeout(() => {
      const playPromise = audioElement.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Audio playback started successfully");
            setIsPlayingAudio(true);
          })
          .catch(err => {
            console.error("Playback promise error:", err);
            setIsPlayingAudio(false);

            // Handle specific promise rejection reasons
            if (err.name === 'NotAllowedError') {
              toast({
                title: "Audio playback blocked",
                description: "Browser requires user interaction first. Please click the audio button again.",
                variant: "destructive",
              });
            } else if (err.name === 'AbortError') {
              console.log("Audio playback aborted - this is normal");
              // Don't show error for aborted playback
            } else if (err.name === 'NotSupportedError') {
              toast({
                title: "Audio not supported",
                description: "Your browser doesn't support this audio format.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Unable to generate voice review",
                description: `Playback failed: ${err.message || 'Unknown error'}`,
                variant: "destructive",
              });
            }
          });
      } else {
        console.error("Audio play() method did not return a promise");
        setIsPlayingAudio(false);
        toast({
          title: "Audio playback failed",
          description: "Browser does not support audio playback.",
          variant: "destructive",
        });
      }
    }, 100); // 100ms delay to ensure audio is loaded
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

    if (autoPlayAudio && reviewContent && !isPlayingAudio && !ttsMutation.isPending && !audioUrl && !reviewMutation.isError) {
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
  }, [autoPlayAudio, reviewContent, isPlayingAudio, ttsMutation.isPending, audioUrl, reviewMutation.isError]);

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