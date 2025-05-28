import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import AudioPlayer from "@/components/audio-player";
import ShareToast from "@/components/share-toast";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, RefreshCcw, InfoIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Define type to fix type errors
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

export default function WeeklyToastPage() {
  // All hooks at the top level
  const [regenerating, setRegenerating] = useState(false);
  const [generatedToast, setGeneratedToast] = useState<{ content: string; audioUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
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
  
  // Using standardized toast format - no style selection needed
  
  // Fetch the latest toast
  const { data: latestToast, isLoading, error } = useQuery<Toast>({
    queryKey: ["/api/toasts/latest"],
    retry: false
  });

  // Toast generation is now handled automatically by the system
  
  // Generate toast handler
  const generateToast = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/toasts/generate", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
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
        const errorData = await res.text();
        console.error("Error generating toast:", errorData);
        
        toast({
          title: "Error generating toast",
          description: `Something went wrong: ${res.status} ${res.statusText}`,
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
      const res = await fetch("/api/toasts/regenerate", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
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
        const errorData = await res.text();
        console.error("Error regenerating toast:", errorData);
        
        toast({
          title: "Error regenerating toast",
          description: `Something went wrong: ${res.status} ${res.statusText}`,
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
            <div className="text-center mb-8">
              <div className="inline-block p-3 rounded-full bg-white bg-opacity-20 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                  <line x1="6" y1="1" x2="6" y2="4"></line>
                  <line x1="10" y1="1" x2="10" y2="4"></line>
                  <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
              </div>
              <h1 className="text-3xl font-bold font-accent mb-4 text-gray-900">Your Personalized Toast</h1>
              <p className="text-xl font-light max-w-xl mx-auto mb-4 text-gray-800">
                {latestToast ? (
                  <>Here's your weekly toast celebrating your progress!</>
                ) : (
                  <>Your weekly toast will be automatically generated on your selected day.</>
                )}
              </p>
              

              
              {/* Toast Status Message */}
              <div className="mt-4 text-center">
                {latestToast ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white/20 rounded-lg p-3 mb-4 inline-block">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                      </svg>
                    </div>
                    <p className="text-lg mb-2 text-white">Your weekly toast is ready!</p>
                    <p className="text-sm text-white opacity-90 max-w-md">
                      Your next toast will be automatically generated based on your weekly preferences in your settings.
                    </p>
                    <div className="mt-3">
                      <Link href="/settings">
                        <Button variant="outline" className="bg-white bg-opacity-20 hover:bg-opacity-30 border-white text-white">
                          Adjust Toast Preferences
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="bg-white/20 rounded-lg p-3 mb-4 inline-block">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    </div>
                    <p className="text-sm text-gray-800 max-w-md">
                      Continue adding daily reflections to make your toast more meaningful.
                    </p>
                    <p className="text-xs mt-2 p-2 bg-blue-900/80 rounded-md max-w-md text-white">
                      <strong>New!</strong> Toast generation is now fully automated. Your weekly toast will appear 
                      here on your selected day without any manual action needed.
                    </p>
                    <div className="mt-4">
                      <Link href="/settings">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-medium">
                          Set Toast Schedule
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Toast Preview Card */}
            <div 
              className="bg-gray-100 rounded-lg shadow-xl overflow-hidden text-gray-800 animate-[celebrate_0.8s_ease-in-out_forwards]" 
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
                <h3 className="font-medium text-lg mb-4 text-gray-800">Your Toast Transcript</h3>
                
                <div className="space-y-4 text-gray-800 font-medium">
                  {toastToDisplay.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-800 font-medium">{paragraph}</p>
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