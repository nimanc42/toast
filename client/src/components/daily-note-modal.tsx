import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Mic, MicOff } from "lucide-react";

// TypeScript definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
}

// Extend the Window interface
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    mozSpeechRecognition?: new () => SpeechRecognition;
    msSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface DailyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyNoteModal({ isOpen, onClose }: DailyNoteModalProps) {
  const [inputType, setInputType] = useState<"text" | "audio">("text");
  const [textContent, setTextContent] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Speech recognition reference
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Initialize speech recognition when component mounts
  useEffect(() => {
    // Check if the browser supports SpeechRecognition
    if (typeof window !== 'undefined') {
      // Check for various implementations across browsers - Safari and Chrome primarily use webkitSpeechRecognition
      const SpeechRecognitionAPI = (
        window.webkitSpeechRecognition || 
        window.SpeechRecognition || 
        // @ts-ignore - handle vendor prefixed versions
        window.mozSpeechRecognition || 
        // @ts-ignore
        window.msSpeechRecognition
      );
      
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false; // Set to false for more reliable results on mobile
        recognition.interimResults = true; // Show results as they come in
        recognition.lang = 'en-US';
        
        // Set up simple and direct event handler for speech recognition results
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          // Access the last result (most recent) from the speech recognition
          const lastResult = event.results[event.results.length - 1];
          
          // Check if this result is final
          if (lastResult.isFinal) {
            // Get the transcript text
            const transcript = lastResult[0].transcript;
            console.log("Final transcript received:", transcript);
            
            // Simply append this text to our existing text
            const newText = textContent ? `${textContent} ${transcript}` : transcript;
            setTextContent(newText);
          }
        };
        
        recognition.onerror = (event: SpeechRecognitionEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          toast({
            title: "Speech Recognition Error",
            description: `Error: ${event.error}. Please try again or type manually.`,
            variant: "destructive",
          });
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
        console.warn("Speech Recognition API not supported in this browser");
      }
    }
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, [toast]);
  
  // Function to toggle speech recognition
  const toggleSpeechRecognition = () => {
    if (!speechSupported) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }
    
    if (isListening) {
      console.log("Stopping speech recognition");
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      console.log("Starting speech recognition");
      // Start listening
      if (recognitionRef.current) {
        try {
          // Reset the input placeholder
          const textElement = document.getElementById('reflectionInput') as HTMLTextAreaElement;
          if (textElement) {
            textElement.placeholder = "Type your reflection here...";
          }
          
          // Start recognition
          recognitionRef.current.start();
          setIsListening(true);
          
          toast({
            title: "Voice-to-text activated",
            description: "Speak clearly and your words will be converted to text.",
          });
        } catch (error) {
          console.error("Failed to start speech recognition:", error);
          toast({
            title: "Failed to start",
            description: "Could not start speech recognition. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };
  
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
    mutationFn: async (data: { content: string; audioUrl?: string; bundleTag?: string | null }) => {
      // Log what's actually being saved - for debugging
      console.log("Saving note with data:", data);
      console.log("User authenticated:", !!user);
      console.log("Auth token:", localStorage.getItem('authToken') ? "Present" : "Missing");
      console.log("Current input type:", inputType);
      console.log("Is speech-to-text active:", isListening);
      
      try {
        const res = await apiRequest("POST", "/api/notes", data);
        const json = await res.json();
        console.log("Save response:", json);
        return json;
      } catch (error) {
        console.error("Error saving note:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Save successful:", data);
      
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
      console.error("Save error in onError handler:", error);
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
    // For text mode, require content
    if (inputType === "text" && !textContent.trim()) {
      toast({
        title: "Empty note",
        description: "Please enter some text for your reflection.",
        variant: "destructive",
      });
      return;
    }
    
    // For audio mode in "not recording" state with no blob, show error
    if (inputType === "audio" && !isRecording && !audioBlob) {
      toast({
        title: "No recording",
        description: "Please record an audio reflection first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Stop any active speech recognition
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
        // Small delay to ensure final transcript is processed
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Stop any active recording
      if (isRecording) {
        stopRecording();
        // Wait for audioBlob to be created
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // TEXT MODE - Save text content (including any voice-to-text transcription)
      if (inputType === "text") {
        // Verify we have text content to save
        const trimmedText = textContent.trim();
        
        if (!trimmedText) {
          toast({
            title: "Empty note",
            description: "Please add some content to your reflection.",
            variant: "destructive",
          });
          return;
        }
        
        console.log("Saving text reflection:", trimmedText);
        
        // Save as a text reflection (not audio)
        saveMutation.mutate({ 
          content: trimmedText,
          // Note: No audioUrl property here because this is a text reflection
          bundleTag: null
        });
      } 
      // AUDIO MODE - Save audio recording
      else if (inputType === "audio" && audioBlob) {
        console.log("Saving audio reflection with URL:", audioUrl);
        
        // Save as an audio reflection
        saveMutation.mutate({ 
          content: "[Audio reflection]",
          audioUrl: audioUrl || "audio-url-placeholder",
          bundleTag: null
        });
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({
        title: "Error saving reflection",
        description: "There was a problem saving your reflection. Please try again.",
        variant: "destructive",
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
        
        {/* TODO (BundledAway): enable bundle picker UI */}
        <input
          type="text"
          name="bundleTag"
          value=""
          disabled
          hidden
        />
        
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
              Text Input
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
              Audio Recording
            </Button>
          </div>
        </div>
        
        {/* Text Input Section */}
        {inputType === "text" && (
          <div className="relative">
            <Textarea
              id="reflectionInput"
              placeholder={isListening ? "Listening for your speech..." : "Type your reflection here..."}
              rows={4}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className={`mb-4 ${isListening ? 'pr-12 border-blue-500 focus-visible:ring-blue-500' : ''}`}
            />
            
            {/* Voice to Text Button */}
            <div className="absolute right-3 bottom-6">
              <Button
                type="button"
                size="icon"
                variant={isListening ? "default" : "outline"}
                className={`h-8 w-8 rounded-full ${isListening ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-gray-600'}`}
                onClick={toggleSpeechRecognition}
                title={isListening ? "Stop listening" : "Speak to convert to text"}
                disabled={!speechSupported}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Voice to Text Indicator */}
            {isListening && (
              <div className="mb-2 text-sm text-blue-600 font-medium">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-ping"></div>
                  Voice-to-Text active: Your speech will be converted to text
                </div>
              </div>
            )}
            
            {/* This second status indicator is redundant - removing it */}
            
            {/* Unsupported Browser Warning */}
            {!speechSupported && (
              <div className="mt-1 text-xs text-orange-600">
                Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.
              </div>
            )}
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
