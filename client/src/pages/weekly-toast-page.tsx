import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import AudioPlayer from "@/components/audio-player";
import ShareToast from "@/components/share-toast";
import Header from "@/components/header";
import Footer from "@/components/footer";
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
  
  // Share demo toast handler
  const shareDemo = (platform: string) => {
    toast({
      title: "Demo Mode",
      description: `Your toast would be shared on ${platform}.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="bg-gradient-to-b from-secondary-600 to-primary-700 flex-grow flex items-center justify-center">
          <div className="text-white text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin mb-4" />
            <p className="text-lg">Loading your weekly toast...</p>
          </div>
        </div>
        <Footer />
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
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gradient-to-b from-secondary-600 to-primary-700">
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
                <h3 className="text-lg font-semibold mb-3">Listen to your toast</h3>
                <AudioPlayer 
                  audioUrl={demoToast.audioUrl} 
                  title="Toast Preview" 
                  duration="2:30" 
                />
                
                {/* Voice Selection */}
                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700 mr-3 font-medium">Voice:</span>
                    <Select 
                      value={selectedVoice} 
                      onValueChange={(voice) => {
                        setSelectedVoice(voice);
                        toast({
                          title: "Voice changed",
                          description: `Voice changed to ${voice === "motivational" ? "Rachel" : voice === "friendly" ? "Adam" : "Domi"}.`,
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm w-64 bg-white border-gray-300">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceOptions.map(voice => (
                          <SelectItem key={voice.id} value={voice.id}>
                            <span className="font-medium">{voice.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              - {voice.description}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
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
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gradient-to-b from-secondary-600 to-primary-700">
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
              <h3 className="text-lg font-semibold mb-3">Listen to your weekly toast</h3>
              {latestToast.audioUrl ? (
                <AudioPlayer 
                  audioUrl={latestToast.audioUrl} 
                  title="Your Week in Review" 
                  duration="2:30" 
                />
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                  <p className="text-amber-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    No audio has been generated for this toast yet. 
                  </p>
                  <Button 
                    onClick={() => regenerateAudioMutation.mutate({ 
                      toastId: latestToast.id, 
                      voiceStyle: selectedVoice 
                    })}
                    className="mt-2 bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300"
                    size="sm"
                    disabled={regenerating}
                  >
                    {regenerating ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" /> 
                        Generating Audio...
                      </>
                    ) : (
                      <>Generate Audio</>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Voice Selection */}
              <div className="mt-4 flex items-center">
                <span className="text-sm text-gray-500 mr-3">Voice:</span>
                <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map(voice => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex justify-between items-center">
                          <span>{voice.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {voice.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {regenerating && (
                  <div className="flex items-center ml-4 text-amber-700 text-sm animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    <span>Regenerating...</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Toast Content */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Your Toast</h3>
                <div className="text-sm text-gray-500">
                  {latestToast.createdAt && format(new Date(latestToast.createdAt), "MMMM d, yyyy")}
                </div>
              </div>
              
              <div className="prose max-w-none whitespace-pre-line">
                {latestToast.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
              
              {/* Share Button */}
              <div className="mt-6 flex justify-end space-x-3">
                <ShareToast 
                  toast={latestToast}
                  onShareClick={handleShare}
                />
              </div>
            </div>
          </div>
          
          {/* Return to Dashboard Link */}
          <div className="mt-8 text-center">
            <Button variant="outline" className="bg-white bg-opacity-20 text-white hover:bg-opacity-30" asChild>
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
      </main>
      <Footer />
    </div>
  );
}