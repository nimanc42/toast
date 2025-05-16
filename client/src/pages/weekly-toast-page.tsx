import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, isBefore, isAfter } from "date-fns";
import { Link } from "wouter";
import AudioPlayer from "@/components/audio-player";
import ShareToast from "@/components/share-toast";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AutoLogin from "@/components/auto-login";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, RefreshCcw, InfoIcon, Clock, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

// Define toast types and period helpers
type ToastRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Function to get date window for a toast range
function getDateWindow(range: ToastRange, userPreferences: { weeklyToastDay?: number } = {}) {
  const now = new Date();
  
  switch (range) {
    case 'daily':
      // Daily toast window is the current day
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
      
    case 'weekly': {
      // Weekly toast uses user's preferred day or defaults to Sunday (0)
      const preferredDay = userPreferences?.weeklyToastDay ?? 0;
      
      // Calculate the previous week's end date (the user's preferred day)
      let weekEnd = startOfWeek(now, { weekStartsOn: 1 }); // Start from Monday
      weekEnd = addDays(weekEnd, (preferredDay === 0 ? 6 : preferredDay - 1)); // Adjust to preferred day
      
      // If we haven't reached the preferred day yet, go back a week
      if (isAfter(weekEnd, now)) {
        weekEnd = addDays(weekEnd, -7);
      }
      
      // The period starts 7 days before the end date
      const weekStart = addDays(weekEnd, -6);
      
      return {
        start: startOfDay(weekStart),
        end: endOfDay(weekEnd)
      };
    }
      
    case 'monthly':
      // Monthly toast is previous month
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
      
      return {
        start: startOfDay(monthStart),
        end: endOfDay(monthEnd)
      };
      
    case 'yearly':
      // Yearly toast is previous year
      const lastYear = now.getFullYear() - 1;
      const yearStart = new Date(lastYear, 0, 1);
      const yearEnd = new Date(lastYear, 11, 31);
      
      return {
        start: startOfDay(yearStart),
        end: endOfDay(yearEnd)
      };
      
    default:
      // Fallback to weekly
      return getDateWindow('weekly', userPreferences);
  }
}

// Check if a toast period is available for generation
function isToastAvailable(range: ToastRange, userPreferences: { weeklyToastDay?: number } = {}) {
  const now = new Date();
  const { end } = getDateWindow(range, userPreferences);
  
  // Toast is available if the period has ended
  return isAfter(now, end);
}

export default function WeeklyToastPage() {
  // All hooks at the top level
  const [selectedVoice, setSelectedVoice] = useState("motivational");
  const [regenerating, setRegenerating] = useState(false);
  const [generatedToast, setGeneratedToast] = useState<{ content: string; audioUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastAvailable, setToastAvailable] = useState<boolean>(false);
  const [nextToastDate, setNextToastDate] = useState<Date | null>(null);
  const { toast } = useToast();
  
  // Fetch user preferences for toast generation timing
  const { data: userPreferences } = useQuery<{ weeklyToastDay: number | null, timezone: string | null }>({
    queryKey: ["/api/user/preferences"],
    retry: false
  });
  
  // Demo toast state for when no toast exists
  const [demoToast, setDemoToast] = useState<Toast>({
    id: 0,
    content: "Welcome to A Toast to You! This is a sample of what your personalized weekly toast will look like. You've been doing a great job with your daily reflections. Your commitment to growth and personal development is inspiring.\n\nThis week, we noticed themes of perseverance, creativity, and self-care in your notes. These qualities will serve you well as you continue on your journey.\n\nHere's to another week of growth and discovery ahead!",
    audioUrl: null,
    createdAt: new Date().toISOString(),
    userId: 0,
    shareCode: "demo",
    shared: false,
    shareUrl: "/shared/demo"
  });
  
  // Voice options with descriptions
  const voiceOptions = [
    { id: "motivational", name: "Rachel", description: "Energetic and motivational" },
    { id: "friendly", name: "Adam", description: "Warm and friendly" },
    { id: "poetic", name: "Domi", description: "Thoughtful and poetic" }
  ];
  
  // Fetch the latest toast
  const { data: latestToast, isLoading, error } = useQuery<Toast>({
    queryKey: ["/api/toasts/latest"],
    retry: false
  });

  // Handle voice selection
  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
  };
  
  // Effect to check toast availability based on user preferences
  useEffect(() => {
    if (userPreferences) {
      const isAvailable = isToastAvailable('weekly', {
        weeklyToastDay: userPreferences.weeklyToastDay ?? undefined
      });
      setToastAvailable(isAvailable);
      
      // Calculate next toast date for display
      if (!isAvailable) {
        const { end } = getDateWindow('weekly', {
          weeklyToastDay: userPreferences.weeklyToastDay ?? undefined
        });
        setNextToastDate(addDays(end, 1)); // Next day after the period ends
      } else {
        setNextToastDate(null);
      }
    }
  }, [userPreferences]);

  // Generate toast handler
  const generateToast = async () => {
    setLoading(true);
    try {
      // Always use bypass parameter for testing until feature is stable
      const bypassParam = '?bypass=true';
      console.log("Generating toast with voice:", selectedVoice);
      
      // Use development endpoint for easier testing
      const endpoint = process.env.NODE_ENV === 'development' ? '/api/dev/toasts/generate' : '/api/toasts/generate';
      const res = await fetch(`${endpoint}${bypassParam}`, { 
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ voice: selectedVoice })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Toast generation data:", data);
        
        if (!data.audioUrl) {
          console.warn("No audio URL in response, likely an issue with ElevenLabs API or Supabase");
        }
        
        // Save the generated toast data
        setGeneratedToast(data);
        
        // If we're in demo mode (no latestToast), update the demoToast
        if (!latestToast) {
          setDemoToast({
            ...demoToast,
            content: data.content,
            audioUrl: data.audioUrl
          });
        }
        
        // Invalidate the latest toast query to refresh the data
        queryClient.invalidateQueries({ queryKey: ["/api/toasts/latest"] });
        
        toast({
          title: "Toast generated!",
          description: "Your weekly toast has been created successfully.",
        });
      } else {
        // Error handling for HTTP errors
        let errorMessage = "Something went wrong with generating your toast.";
        
        try {
          const errorData = await res.json();
          console.error("Error generating toast:", errorData);
          
          // Handle specific error cases
          if (res.status === 409) {
            errorMessage = errorData.error || "A toast has already been generated for this period.";
          } else if (res.status === 400 && errorData.error?.includes("No notes found")) {
            errorMessage = "No notes found for this period. Add some reflections first!";
          }
        } catch (e) {
          // If the response isn't JSON, use text
          try {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            // Fall back to status text if all else fails
            errorMessage = `Error: ${res.status} ${res.statusText}`;
          }
        }
        
        toast({
          title: "Could not generate toast",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error handling for network failures
      console.error("Network error generating toast:", error);
      
      toast({
        title: "Network error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Regenerate toast handler
  const regenerateToast = async () => {
    setRegenerating(true);
    try {
      // Add bypass parameter for testing
      const bypassParam = process.env.NODE_ENV === 'development' ? '?bypass=true' : '';
      
      const res = await fetch(`/api/toasts/regenerate${bypassParam}`, { 
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ voice: selectedVoice })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Invalidate the latest toast query
        queryClient.invalidateQueries({ queryKey: ["/api/toasts/latest"] });
        
        toast({
          title: "Toast regenerated!",
          description: "Your weekly toast has been refreshed.",
        });
      } else {
        // Error handling for HTTP errors
        let errorMessage = "Something went wrong regenerating your toast.";
        
        try {
          const errorData = await res.json();
          console.error("Error regenerating toast:", errorData);
          
          // Handle specific error cases
          if (res.status === 409) {
            errorMessage = errorData.error || "A toast has already been generated for this period.";
          } else if (res.status === 400 && errorData.error?.includes("No notes found")) {
            errorMessage = "No notes found for this period. Add some reflections first!";
          }
        } catch (e) {
          // If the response isn't JSON, use text
          try {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            // Fall back to status text if all else fails
            errorMessage = `Error: ${res.status} ${res.statusText}`;
          }
        }
        
        toast({
          title: "Could not regenerate toast",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Network error regenerating toast:", error);
      
      toast({
        title: "Network error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };
  
  // Sharing logic
  const handleShare = (platform: string, shareUrl: string, text: string) => {
    let shareLink: string | null = null;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text);
    
    switch (platform.toLowerCase()) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      default:
        toast({
          title: "Sharing platform not supported",
          description: `Sharing on ${platform} is not implemented yet.`,
        });
        return;
    }
    
    // Open the sharing link in a new window
    if (shareLink) {
      window.open(shareLink, '_blank', 'noopener,noreferrer');
    }
    
    // Track the sharing activity
    toast({
      title: "Sharing on " + platform,
      description: "Opening share dialog...",
    });
  };

  // Determine which toast to display
  const toastToDisplay = latestToast || (generatedToast ? {
    id: 0,
    content: generatedToast.content,
    audioUrl: generatedToast.audioUrl,
    createdAt: new Date().toISOString(),
    userId: 0,
    shared: false
  } : demoToast);

  // Render the component with a single return and conditional rendering
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      {isLoading ? (
        // Loading state
        <div className="bg-gradient-to-b from-secondary-600 to-primary-700 flex-grow flex items-center justify-center">
          <div className="text-white text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin mb-4" />
            <p className="text-lg">Loading your weekly toast...</p>
          </div>
        </div>
      ) : (
        // Main content - either actual toast, generated toast, or demo toast
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
                {latestToast ? (
                  <>Here's your weekly toast celebrating your progress!</>
                ) : (
                  <>Create your weekly toast to celebrate your progress!</>
                )}
              </p>
              
              {/* Auto-login button for development */}
              {process.env.NODE_ENV === 'development' && !user && (
                <div className="flex justify-center mb-4">
                  <AutoLogin />
                </div>
              )}
              
              {/* Generate or Regenerate button */}
              {latestToast ? (
                <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <div className="flex flex-col">
                    <label htmlFor="voice-select" className="block text-sm font-medium text-white mb-1">
                      Voice:
                    </label>
                    <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                      <SelectTrigger className="w-[200px] mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceOptions.map(voice => (
                          <SelectItem key={voice.id} value={voice.id} className="text-gray-900">
                            <div className="flex flex-col">
                              <span>{voice.name}</span>
                              <span className="text-xs text-gray-500">{voice.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={regenerateToast} 
                          disabled={regenerating || !toastAvailable}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {regenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Regenerating...
                            </>
                          ) : !toastAvailable && nextToastDate ? (
                            <>
                              <Clock className="mr-2 h-4 w-4" />
                              Available {format(nextToastDate, "EEEE, MMM d")}
                            </>
                          ) : (
                            <>
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Regenerate Toast
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Generate a new toast with your latest reflections</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <div className="flex flex-col">
                    <label htmlFor="voice-generate" className="block text-sm font-medium text-white mb-1">
                      Voice:
                    </label>
                    <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                      <SelectTrigger className="w-[200px] mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceOptions.map(voice => (
                          <SelectItem key={voice.id} value={voice.id} className="text-gray-900">
                            <div className="flex flex-col">
                              <span>{voice.name}</span>
                              <span className="text-xs text-gray-500">{voice.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={generateToast} 
                          disabled={loading || !toastAvailable}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : !toastAvailable && nextToastDate ? (
                            <>
                              <Clock className="mr-2 h-4 w-4" />
                              Available {format(nextToastDate, "EEEE, MMM d")}
                            </>
                          ) : (
                            <>
                              Generate This Week's Toast
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Create a toast based on your recent reflections</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            
            {/* Toast Preview Card */}
            <div 
              className="bg-white rounded-lg shadow-xl overflow-hidden text-gray-800 animate-[celebrate_0.8s_ease-in-out_forwards]" 
              style={{ animationDelay: "0.2s" }}
              id="demo-toast-container"
            >
              {/* Audio Player */}
              <div className="bg-gray-50 p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Listen to your toast</h3>
                <AudioPlayer 
                  audioUrl={toastToDisplay.audioUrl} 
                  title="Your Weekly Toast" 
                  duration="" 
                />
              </div>
              
              {/* Toast Transcript */}
              <div className="p-6">
                <h3 className="font-medium text-lg mb-4">Your Toast Transcript</h3>
                
                <div className="space-y-4 text-gray-700">
                  {toastToDisplay.content.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
              
              {/* Sharing section */}
              {latestToast && (
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <h3 className="font-medium text-lg mb-4">Share Your Toast</h3>
                  <ShareToast 
                    toast={latestToast} 
                    onShareClick={(platform) => handleShare(platform, latestToast.shareUrl || window.location.href, latestToast.content)}
                  />
                </div>
              )}
              
              {/* Toast metadata footer */}
              {latestToast && (
                <div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-500">
                  Generated on {format(new Date(latestToast.createdAt), "MMMM d, yyyy")}
                </div>
              )}
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
      )}
      
      <Footer />
    </div>
  );
}