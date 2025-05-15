import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import AudioPlayer from "@/components/audio-player";
import ShareToast from "@/components/share-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, RefreshCcw, InfoIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function WeeklyToastPage() {
  const [selectedVoice, setSelectedVoice] = useState("motivational");
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();
  
  // Voice options with descriptions
  const voiceOptions = [
    { id: "motivational", name: "Rachel", description: "Energetic and motivational" },
    { id: "friendly", name: "Adam", description: "Warm and friendly" },
    { id: "poetic", name: "Domi", description: "Thoughtful and poetic" }
  ];
  
  // Define a Toast type to fix type errors
  interface Toast {
    id: number;
    content: string;
    audioUrl: string | null;
    createdAt: string;
    userId: number;
    shareCode?: string;
    shared: boolean;
    shareUrl?: string;
  }
  
  // Fetch the latest toast
  const { data: latestToast, isLoading, error } = useQuery<Toast>({
    queryKey: ["/api/toasts/latest"],
    retry: false, // Don't retry on error (like 404)
    staleTime: 60000, // 1 minute
  });

  // Mutation to generate a new toast
  const generateToastMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/toasts/generate", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toasts/latest"] });
      toast({
        title: "Toast Generated",
        description: "Your weekly toast has been created based on your recent notes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate toast",
        description: error.message || "Please ensure you have recent notes.",
        variant: "destructive"
      });
    }
  });

  // Mutation to regenerate audio with a different voice
  const regenerateAudioMutation = useMutation({
    mutationFn: async ({ toastId, voiceStyle }: { toastId: number, voiceStyle: string }) => {
      const res = await apiRequest(
        "POST", 
        `/api/toasts/${toastId}/regenerate-audio`,
        { voiceStyle }
      );
      return await res.json();
    },
    onMutate: () => {
      setRegenerating(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toasts/latest"] });
      toast({
        title: "Audio regenerated",
        description: "Your toast audio has been regenerated with the new voice.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to regenerate audio",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setRegenerating(false);
    }
  });

  // Handle voice change and regenerate audio
  const handleVoiceChange = (voiceStyle: string) => {
    setSelectedVoice(voiceStyle);
    
    if (latestToast && latestToast.id) {
      regenerateAudioMutation.mutate({ 
        toastId: latestToast.id, 
        voiceStyle 
      });
    }
  };

  // Share toast handler
  const handleShare = (platform: string) => {
    if (!latestToast) return;
    
    // In a real implementation, we would handle the sharing functionality
    // For now, we'll just show a toast message
    toast({
      title: "Sharing is not implemented yet",
      description: `Your toast would be shared on ${platform}.`,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-b from-secondary-600 to-primary-700 min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin mb-4" />
          <p className="text-lg">Loading your weekly toast...</p>
        </div>
      </div>
    );
  }

  if (!latestToast || error) {
    // Demo toast content for UI testing
    const demoToast: Toast = {
      id: 0,
      content: "Welcome to A Toast to You! This is a sample of what your personalized weekly toast will look like. You've been doing a great job with your daily reflections. Your commitment to growth and personal development is inspiring.\n\nThis week, we noticed themes of perseverance, creativity, and self-care in your notes. These qualities will serve you well as you continue on your journey.\n\nHere's to another week of growth and discovery ahead!",
      audioUrl: "/audio/toast-1747269138152.mp3", // Use one of our test audio files
      createdAt: new Date().toISOString(),
      userId: 0,
      shareCode: "demo",
      shared: false,
      shareUrl: "/shared/demo"
    };
    
    return (
      <div className="bg-gradient-to-b from-secondary-600 to-primary-700 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-white">
          <div className="text-center mb-12">
            <div className="inline-block p-3 rounded-full bg-white bg-opacity-10 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                <line x1="6" y1="1" x2="6" y2="4"></line>
                <line x1="10" y1="1" x2="10" y2="4"></line>
                <line x1="14" y1="1" x2="14" y2="4"></line>
              </svg>
            </div>
            <h1 className="text-3xl font-bold font-accent mb-4">Your Personalized Toast</h1>
            <p className="text-xl font-light max-w-xl mx-auto mb-4">
              You don't have any real toasts yet, but here's a preview of what they'll look like! 
              Create a few daily reflections and then generate your weekly toast.
            </p>
            
            <Button
              onClick={() => generateToastMutation.mutate()}
              disabled={generateToastMutation.isPending}
              className="mx-auto mt-6 bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-all"
              size="lg"
            >
              {generateToastMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Toast...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  Generate My Weekly Toast
                </>
              )}
            </Button>
          </div>
          
          {/* Demo Toast Preview */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden text-gray-800 animate-[celebrate_0.8s_ease-in-out_forwards]" style={{ animationDelay: "0.2s" }}>
            {/* Audio Player */}
            <div className="bg-gray-50 p-6 border-b border-gray-200">
              <AudioPlayer 
                audioUrl={demoToast.audioUrl} 
                title="Toast Preview" 
                duration="2:30" 
              />
              
              {/* Voice Selection */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">Voice:</span>
                  <Select 
                    value={selectedVoice} 
                    onValueChange={setSelectedVoice}
                    disabled={true}
                  >
                    <SelectTrigger className="h-8 text-xs w-64">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motivational">Motivational Coach (Rachel)</SelectItem>
                      <SelectItem value="friendly">Friendly Conversationalist (Adam)</SelectItem>
                      <SelectItem value="poetic">Poetic Narrator (Domi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center text-xs text-primary-600">
                  <span>Demo mode</span>
                </div>
              </div>
            </div>
            
            {/* Toast Transcript */}
            <div className="p-6">
              <h3 className="font-medium text-lg mb-4">Your Toast Transcript</h3>
              
              <div className="space-y-4 text-gray-700">
                {demoToast.content.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
            
            {/* Demo Share Toast Options */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Share Your Toast</h3>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      toast({
                        title: "Demo Mode",
                        description: "Sharing functionality is available when you have real toasts."
                      });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                      <polyline points="16 6 12 2 8 6"></polyline>
                      <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                    Share Toast
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Return to Dashboard */}
          <div className="text-center mt-8">
            <Button 
              variant="secondary" 
              className="bg-white text-primary-700 hover:bg-white/90"
              asChild
            >
              <Link href="/">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-secondary-600 to-primary-700 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-white">
        {/* Toast Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-3 rounded-full bg-white bg-opacity-10 mb-4 animate-[celebrate_0.8s_ease-in-out_forwards]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-accent mb-4">Your Weekly Toast</h1>
          <p className="text-xl font-light max-w-xl mx-auto mb-3">
            A celebration of your week's positive moments and accomplishments
          </p>
          
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => generateToastMutation.mutate()}
              disabled={generateToastMutation.isPending}
              variant="outline"
              className="bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-all"
            >
              {generateToastMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating New Toast...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  Generate New Toast
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Toast Content Card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden text-gray-800 animate-[celebrate_0.8s_ease-in-out_forwards]" style={{ animationDelay: "0.2s" }}>
          {/* Audio Player */}
          <div className="bg-gray-50 p-6 border-b border-gray-200">
            <AudioPlayer 
              audioUrl={latestToast.audioUrl} 
              title="Your Week in Review" 
              duration={latestToast.audioUrl ? "2:30" : "0:00"} 
            />
            
            {/* Voice Selection */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">Voice:</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help mr-1">
                          <InfoIcon className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Select different voices powered by ElevenLabs AI to narrate your weekly toast</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Select 
                    value={selectedVoice} 
                    onValueChange={setSelectedVoice}
                    disabled={regenerating}
                  >
                    <SelectTrigger className="h-8 text-xs w-64">
                      <SelectValue>
                        {voiceOptions.find(v => v.id === selectedVoice)?.name || "Select a voice"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {voiceOptions.map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex flex-col">
                            <span>{voice.name}</span>
                            <span className="text-xs text-muted-foreground">{voice.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                  onClick={() => {
                    if (latestToast && latestToast.id) {
                      regenerateAudioMutation.mutate({ 
                        toastId: latestToast.id, 
                        voiceStyle: selectedVoice 
                      });
                    }
                  }}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <>
                      <RefreshCcw className="h-3 w-3 animate-spin" />
                      <span>Regenerating...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-3 w-3" />
                      <span>Apply Voice</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Toast Transcript */}
          <div className="p-6">
            <h3 className="font-medium text-lg mb-4">Your Toast Transcript</h3>
            
            <div className="space-y-4 text-gray-700">
              {latestToast.content.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
          
          {/* Share Toast Options */}
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Share Your Toast</h3>
              <div className="flex gap-3">
                <ShareToast toast={latestToast} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Return to Dashboard */}
        <div className="text-center mt-8">
          <Link href="/">
            <Button variant="link" className="text-white hover:text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
