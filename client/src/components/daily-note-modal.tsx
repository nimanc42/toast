import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface DailyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyNoteModal({ isOpen, onClose }: DailyNoteModalProps) {
  const [inputType, setInputType] = useState<"text" | "audio">("text");
  const [textContent, setTextContent] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Audio recorder hook
  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    clearRecording
  } = useAudioRecorder();
  
  // Audio element ref for playing recorded audio
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  
  // Save note mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { content?: string; audioUrl?: string }) => {
      const res = await apiRequest("POST", "/api/notes", {
        userId: user!.id,
        ...data
      });
      return res.json();
    },
    onSuccess: () => {
      // Reset form
      setTextContent("");
      clearRecording();
      // Close modal
      onClose();
      // Show success message
      toast({
        title: "Note saved!",
        description: "Your daily reflection has been recorded.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save note",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Format recording time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle saving the note
  const handleSave = async () => {
    if (inputType === "text" && !textContent.trim()) {
      toast({
        title: "Empty note",
        description: "Please enter some text for your reflection.",
        variant: "destructive",
      });
      return;
    }
    
    if (inputType === "audio" && !audioBlob) {
      toast({
        title: "No recording",
        description: "Please record an audio reflection first.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, we would upload the audio blob to a storage service
    // and save the URL. For this prototype, we'll just save the content.
    if (inputType === "text") {
      saveMutation.mutate({ content: textContent });
    } else if (audioBlob) {
      // In a real implementation, we would upload the audio blob here
      // and get back a URL to store. For now, we'll just create a note
      // with placeholder text.
      saveMutation.mutate({ 
        content: "[Audio reflection]",
        audioUrl: "audio-url-placeholder" 
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Today's Reflection</DialogTitle>
          <DialogDescription>
            What's something positive about today that you want to celebrate?
          </DialogDescription>
        </DialogHeader>
        
        {/* Input Type Toggle */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <Button
              type="button"
              variant={inputType === "text" ? "secondary" : "outline"}
              className={`rounded-l-md ${inputType === "text" ? "bg-primary-50 text-primary-700 hover:bg-primary-100" : ""}`}
              onClick={() => setInputType("text")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="17" y1="10" x2="3" y2="10"></line>
                <line x1="21" y1="6" x2="3" y2="6"></line>
                <line x1="21" y1="14" x2="3" y2="14"></line>
                <line x1="17" y1="18" x2="3" y2="18"></line>
              </svg>
              Text
            </Button>
            <Button
              type="button"
              variant={inputType === "audio" ? "secondary" : "outline"}
              className={`rounded-r-md ${inputType === "audio" ? "bg-primary-50 text-primary-700 hover:bg-primary-100" : ""}`}
              onClick={() => setInputType("audio")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              Audio
            </Button>
          </div>
        </div>
        
        {/* Text Input Section */}
        {inputType === "text" && (
          <div>
            <Textarea
              placeholder="Type your reflection here..."
              rows={4}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="mb-4"
            />
          </div>
        )}
        
        {/* Audio Input Section */}
        {inputType === "audio" && (
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            {/* Not Recording State */}
            {!isRecording && !audioBlob && (
              <div>
                <Button
                  onClick={startRecording}
                  variant="outline"
                  size="icon"
                  className="w-16 h-16 rounded-full bg-accent-100 text-accent-600 hover:bg-accent-200 transition duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </Button>
                <p className="mt-2 text-sm text-gray-600">Tap to start recording</p>
              </div>
            )}
            
            {/* Recording State */}
            {isRecording && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-accent-600 text-white flex items-center justify-center animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-medium">{formatTime(recordingTime)}</span>
                  <p className="text-gray-600">Recording...</p>
                </div>
                <Button
                  onClick={stopRecording}
                  size="sm"
                  variant="secondary"
                  className="mt-3 text-xs rounded-full px-3 py-1.5 bg-accent-600 text-white hover:bg-accent-700 focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
                >
                  Stop Recording
                </Button>
              </div>
            )}
            
            {/* Recording Preview */}
            {!isRecording && audioBlob && audioUrl && (
              <div>
                <div className="bg-white rounded-lg p-3 border border-gray-200 mb-3">
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => {
                        if (audioPlayerRef.current) {
                          if (audioPlayerRef.current.paused) {
                            audioPlayerRef.current.play();
                          } else {
                            audioPlayerRef.current.pause();
                          }
                        }
                      }}
                      variant="default"
                      size="icon"
                      className="w-8 h-8 rounded-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </Button>
                    <div className="flex-grow">
                      <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary-500 h-full w-1/3"></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">0:00</span>
                  </div>
                  <audio ref={audioPlayerRef} src={audioUrl} className="hidden" />
                </div>
                <div className="flex justify-center space-x-3">
                  <Button
                    onClick={clearRecording}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full px-3 py-1.5 border-gray-300 text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Delete
                  </Button>
                  <Button
                    onClick={() => {
                      clearRecording();
                      startRecording();
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full px-3 py-1.5 border-primary-300 text-primary-700 hover:bg-primary-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                    </svg>
                    Record Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Reflection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
