import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import AudioPlayer from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WeeklyToastPage() {
  const [selectedVoice, setSelectedVoice] = useState("motivational");
  const { toast } = useToast();
  
  // Fetch the latest toast
  const { data: latestToast, isLoading } = useQuery({
    queryKey: ["/api/toasts/latest"],
    onError: () => {
      toast({
        title: "No weekly toast found",
        description: "It looks like you don't have any weekly toasts yet. Continue adding daily reflections to receive your first toast!",
        variant: "destructive"
      });
    }
  });

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

  if (!latestToast) {
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
            <h1 className="text-3xl font-bold font-accent mb-4">No Toast Yet</h1>
            <p className="text-xl font-light max-w-xl mx-auto mb-8">
              Keep adding your daily reflections to get your first weekly toast!
            </p>
            
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
          <p className="text-xl font-light max-w-xl mx-auto">
            A celebration of your week's positive moments and accomplishments
          </p>
        </div>
        
        {/* Toast Content Card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden text-gray-800 animate-[celebrate_0.8s_ease-in-out_forwards]" style={{ animationDelay: "0.2s" }}>
          {/* Audio Player */}
          <div className="bg-gray-50 p-6 border-b border-gray-200">
            <AudioPlayer 
              audioUrl={latestToast.audioUrl} 
              title="Your Week in Review" 
              duration="3:24" 
            />
            
            {/* Voice Selection */}
            <div className="mt-4 flex items-center">
              <span className="text-xs text-gray-500 mr-2">Voice:</span>
              <Select 
                value={selectedVoice} 
                onValueChange={setSelectedVoice}
              >
                <SelectTrigger className="h-8 text-xs w-64">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motivational">Motivational Coach (Morgan)</SelectItem>
                  <SelectItem value="friendly">Friendly Conversationalist (Alex)</SelectItem>
                  <SelectItem value="poetic">Poetic Narrator (Jordan)</SelectItem>
                </SelectContent>
              </Select>
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
          
          {/* Sharing Options */}
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Share Your Toast</h3>
              <div className="flex space-x-3">
                <Button 
                  size="icon" 
                  variant="default" 
                  className="rounded-full bg-blue-500 hover:bg-blue-600"
                  onClick={() => handleShare("Twitter")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </Button>
                <Button 
                  size="icon" 
                  variant="default" 
                  className="rounded-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => handleShare("Facebook")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </Button>
                <Button 
                  size="icon" 
                  variant="default" 
                  className="rounded-full bg-green-500 hover:bg-green-600"
                  onClick={() => handleShare("Email")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </Button>
                <Button 
                  size="icon" 
                  variant="default" 
                  className="rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({
                      title: "Link copied!",
                      description: "The link to your toast has been copied to clipboard.",
                    });
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </Button>
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
