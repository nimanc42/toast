import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Reset state when the dialog opens or closes
  useEffect(() => {
    if (!isOpen) {
      setReviewContent("");
      setAudioUrl(null);
      setIsPlayingAudio(false);
      setButtonDisabled(false);
    }
  }, [isOpen]);

  // Get review mutation
  const reviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/notes/${id}/review`);
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setReviewContent(data.review);
      // If we have cached audio, set it immediately and don't need to generate
      if (data.audioUrl) {
        console.log("Using cached audio from review response:", data.audioUrl);
        setAudioUrl(data.audioUrl);
      }
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
      const res = await apiRequest("POST", "/api/tts/review", { 
        text, 
        noteId: noteId 
      });
      const data = await res.json();
      return data.audioUrl;
    },
    onSuccess: (url) => {
      console.log("TTS generation successful, audio URL:", url);
      setAudioUrl(url);

      // Automatically play the audio once it's generated
      setTimeout(() => {
        const audio = audioRef.current;
        if (audio && url) {
          audio.src = `/api/audio/proxy?url=${encodeURIComponent(url)}`;
          audio.play().then(() => {
            console.log("Auto-playing generated audio");
            setIsPlayingAudio(true);
          }).catch((error) => {
            console.error("Failed to auto-play generated audio:", error);
          });
        }
      }, 100);
    },
    onError: (error: Error) => {
      console.error("TTS generation failed:", error);
      toast({
        title: "Failed to generate audio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle playing audio
  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    console.log("Playing audio:", audioUrl);
    audio.src = `/api/audio/proxy?url=${encodeURIComponent(audioUrl)}`;

    try {
      await audio.play();
      setIsPlayingAudio(true);
    } catch (error) {
      console.error("Failed to play audio:", error);
      toast({
        title: "Playback failed",
        description: "Could not play the audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle stopping audio
  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log("Stopping audio");
    audio.pause();
    audio.currentTime = 0;
    setIsPlayingAudio(false);
  };

  // Handle read aloud (generate audio if needed, then play/stop)
  const handleReadAloud = () => {
    console.log("=== HANDLE READ ALOUD ===");
    console.log("isPlayingAudio:", isPlayingAudio);
    console.log("audioUrl:", audioUrl);
    console.log("reviewContent:", reviewContent);
    console.log("ttsMutation.isPending:", ttsMutation.isPending);
    console.log("buttonDisabled:", buttonDisabled);

    // Prevent action if button is disabled (debouncing)
    if (buttonDisabled) {
      console.log("Button disabled, ignoring click");
      return;
    }

    // If audio is currently playing, stop it
    if (isPlayingAudio) {
      handleStop();
    } else if (audioUrl) {
      // If we have audio but it's not playing, play it
      handlePlay();
    } else if (reviewContent && !ttsMutation.isPending) {
      // Only generate new audio if we don't already have one and not already requesting
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

        {reviewContent && (
          <div className="prose prose-sm max-w-none text-gray-700 mb-4">
            <p className="leading-relaxed">{reviewContent}</p>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleReadAloud}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            disabled={ttsMutation.isPending || !reviewContent || buttonDisabled}
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
            ) : buttonDisabled ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait...
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

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          style={{ display: 'none' }}
          playsInline
          crossOrigin="anonymous"
          onEnded={handleStop}
          onError={() => {
            console.error("Audio element error");
            setIsPlayingAudio(false);
            toast({
              title: "Audio playback error",
              description: "There was an error playing the audio file. Please try again.",
              variant: "destructive",
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}