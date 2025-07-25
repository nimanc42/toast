import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import Header from "@/components/header";
import Footer from "@/components/footer";
import DailyNoteModal from "@/components/daily-note-modal";
import NoteHistory from "@/components/note-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Volume2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Define types to fix TypeScript errors
interface Stats {
  streak: number;
  weeklyNotesCount: number;
  totalNotesNeeded: number;
  nextToastDate: string;
}

interface VoicePreference {
  id?: number;
  userId?: number;
  voiceStyle: string;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  sampleUrl: string;
}

export default function HomePage() {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("motivational");
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch available voices from API
  const { data: voiceOptions } = useQuery<VoiceOption[]>({
    queryKey: ["/api/voices"]
  });



  // Fetch voice preference
  const { data: voicePreference } = useQuery<VoicePreference>({
    queryKey: ["/api/preferences"]
  });

  // Update voice preference when preferences load
  useEffect(() => {
    if (voicePreference && voicePreference.voiceStyle) {
      setSelectedVoice(voicePreference.voiceStyle);
    }
  }, [voicePreference]);

  // Update voice preference mutation
  const updateVoiceMutation = useMutation({
    mutationFn: async (voice: string) => {
      return await apiRequest("PUT", "/api/preferences", { voiceStyle: voice });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Voice preference updated",
        description: "Your preferred voice has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating voice preference",
        description: "There was an error updating your voice preference. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle voice selection - only updates local state, doesn't call API
  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
    // Voice preference will be saved when user navigates away or clicks save
  };

  // Play a voice preview using the sample MP3 files
  const playVoicePreview = async (e: React.MouseEvent) => {
    e.preventDefault();

    const audio = document.getElementById('voicePreview') as HTMLAudioElement;
    if (!audio) return;

    // stop any current playback
    audio.pause();
    audio.currentTime = 0;

    // Find the selected voice in our options
    const selectedVoiceObj = voiceOptions?.find(voice => voice.id === selectedVoice);
    if (!selectedVoiceObj) {
      toast({
        title: "Preview not available",
        description: `Preview not available for "${getVoiceName(selectedVoice)}" voice.`,
        variant: "destructive"
      });
      return;
    }

    // Add cache-busting timestamp to ensure fresh audio file
    const cacheBustUrl = selectedVoiceObj.sampleUrl + '?v=' + Date.now();
    audio.src = cacheBustUrl;

    // Add debugging event listeners
    audio.oncanplaythrough = () => {
      console.log('Sample loaded successfully:', selectedVoiceObj.name);
    };

    audio.onerror = (e) => {
      console.error('Audio load error:', e, 'for voice:', selectedVoiceObj.name);
      setPreviewPlaying(false);
      toast({
        title: 'Audio loading failed',
        description: 'The audio file could not be loaded. Please check your network connection and try again.',
        variant: 'destructive',
      });
    };

    audio.onloadstart = () => {
      console.log('Audio loading started for:', selectedVoiceObj.name);
    };

    audio.load();          // force refresh

    try {
      await audio.play();  // <-- inside the user-gesture
      setPreviewPlaying(true);
      console.log('Audio playback started successfully');
    } catch (err: any) {
      console.error('Audio playback error:', err);
      setPreviewPlaying(false);

      // More specific error handling
      if (err.name === 'NotAllowedError') {
        toast({
          title: 'Permission needed',
          description: 'Please tap the play button again to allow audio playback.',
          variant: 'destructive',
        });
      } else if (err.name === 'NotSupportedError') {
        toast({
          title: 'Audio format not supported',
          description: 'Your browser cannot play this audio format. Try using Chrome or Safari.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Playback failed',
          description: 'Audio playback failed. Please try again or check your network connection.',
          variant: 'destructive',
        });
      }
    }
  };

  // Helper to get voice name for display in messages
  const getVoiceName = (voiceId: string): string => {
    const voice = voiceOptions?.find(v => v.id === voiceId);
    return voice ? voice.name : voiceId;
  };

  // Fetch user stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchOnWindowFocus: true
  });

  // Fetch today's note to check if user has added a note today
  const { data: todayNotes, isLoading: isLoadingTodayNote } = useQuery<any[]>({
    queryKey: ["/api/notes/today"],
    refetchOnWindowFocus: true
  });

  const hasCompletedToday = todayNotes && todayNotes.length > 0;

  // Format the next toast date
  const formattedNextToastDate = stats?.nextToastDate 
    ? format(new Date(stats.nextToastDate), "EEEE, MMMM d")
    : "";

  // Calculate the percentage for the progress circle
  const progressPercentage = stats 
    ? Math.round((stats.weeklyNotesCount / stats.totalNotesNeeded) * 100) 
    : 0;

  // Calculate the stroke-dashoffset for SVG circle
  const calculateStrokeDashoffset = (percent: number) => {
    const circumference = 2 * Math.PI * 45; // 2πr where r = 45
    const offset = circumference - (percent / 100) * circumference;
    return offset;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Streak and Daily Toast Banner */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="mb-4 sm:mb-0">
                    <h2 className="text-xl font-semibold text-gray-800 mb-1">
                      Welcome back, {user?.name?.split(" ")[0] || "Friend"}!
                    </h2>
                    <p className="text-gray-600">
                      {format(new Date(), "EEEE, MMMM d")} · 
                      {isLoadingStats ? (
                        <span className="ml-2"><Loader2 className="h-4 w-4 inline animate-spin" /></span>
                      ) : (
                        <span className="ml-2 font-medium text-primary-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline text-orange-500 mr-1" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.25C10.9 2.25 10 3.15 10 4.25V7.75C10 8.85 10.9 9.75 12 9.75C13.1 9.75 14 8.85 14 7.75V4.25C14 3.15 13.1 2.25 12 2.25Z" />
                            <path d="M10.89 9.22L15.19 22.28C15.36 22.83 15.9 23.2 16.48 23.1C17.03 23 17.39 22.49 17.33 21.93L16.16 15.9C16.08 15.29 16.61 14.77 17.22 14.85L21.06 15.46C21.6 15.54 22.11 15.19 22.22 14.65C22.33 14.09 21.94 13.56 21.39 13.45L7.75 10.67C8.29 10.27 8.46 9.99 8.89 9.22H10.89Z" />
                            <path d="M4.39 11.55C3.96 11.5 3.56 11.81 3.5 12.24L2.74 17.96C2.68 18.39 2.99 18.79 3.42 18.85C3.85 18.91 4.26 18.6 4.32 18.17L5.07 12.45C5.13 12.02 4.82 11.61 4.39 11.55Z" />
                          </svg>
                          {stats?.streak || 0} day streak
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Button 
                      onClick={() => setIsNoteModalOpen(true)}
                      variant={hasCompletedToday ? "outline" : "default"}
                      className={hasCompletedToday ? "border-green-300 text-green-700" : ""}
                    >
                      {hasCompletedToday ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Completed Today
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Today's Reflection
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Toast Preview */}
            <div className="card bg-white overflow-hidden shadow rounded-lg mb-6 text-gray-900 border border-gray-100">
              <div className="px-4 py-8 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-amber-100">
                      <img src="/logo.png" alt="A Toast Logo" className="h-10 w-10 object-contain rounded-full" />
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Weekly Toast</h2>
                  <p className="mb-6 max-w-md text-gray-700">
                    {isLoadingStats ? (
                      <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                    ) : (
                      <>
                        Your next toast will be ready on <span className="font-medium">{formattedNextToastDate}</span>. 
                        You've added <strong>{stats?.weeklyNotesCount || 0} of {stats?.totalNotesNeeded || 7}</strong> notes this week!
                      </>
                    )}
                  </p>

                  {/* Circular progress indicator */}
                  <div className="relative h-24 w-24 mb-6">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="8" />
                      {/* Progress circle */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="rgba(245, 158, 11, 0.9)" 
                        strokeWidth="8" 
                        strokeDasharray={2 * Math.PI * 45} 
                        strokeDashoffset={calculateStrokeDashoffset(progressPercentage)} 
                        transform="rotate(-90 50 50)" 
                      />
                      <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#000">
                        {stats?.weeklyNotesCount || 0}/{stats?.totalNotesNeeded || 7}
                      </text>
                    </svg>
                  </div>

                  {/* Voice Preference Section */}
                  <div className="mb-6 bg-amber-50 rounded-lg p-4 max-w-md mx-auto">
                    <div className="flex flex-col items-start mb-3">
                      <h3 className="text-base font-medium mb-1 text-amber-800">Voice Preference</h3>
                      <p className="text-sm text-amber-700 opacity-80">Choose your preferred narrator voice</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Hidden audio element for voice preview */}
                      <audio
                        id="voicePreview"
                        style={{ display: 'none' }}
                        playsInline   // iOS: don't force fullscreen
                        crossOrigin="anonymous"
                        onEnded={() => setPreviewPlaying(false)}
                        onError={() => setPreviewPlaying(false)}
                      ></audio>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select
                          value={selectedVoice}
                          onValueChange={handleVoiceChange}
                        >
                          <SelectTrigger className="bg-white border-amber-200 w-full">
                            <SelectValue placeholder="Select voice" />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceOptions?.map(voice => (
                              <SelectItem key={voice.id} value={voice.id}>
                                {voice.name} <span className="text-gray-500 text-sm">({voice.description})</span>
                              </SelectItem>
                            )) || []}
                          </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                          <Button 
                            onClick={(e) => playVoicePreview(e)} 
                            disabled={previewPlaying}
                            variant="outline"
                            className="border-amber-300 text-amber-800 hover:bg-amber-100"
                          >
                            {previewPlaying ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Playing...
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-4 w-4 mr-2" />
                                Preview Voice
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => updateVoiceMutation.mutate(selectedVoice)}
                            disabled={updateVoiceMutation.isPending}
                            variant="outline" 
                            className="border-green-300 text-green-800 hover:bg-green-100"
                          >
                            {updateVoiceMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Save Voice
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                      variant="default" 
                      className="bg-amber-500 text-white hover:bg-amber-600"
                      asChild
                    >
                      <Link href="/weekly-toast">
                        Preview Latest Toast
                      </Link>
                    </Button>
                </div>
              </div>
            </div>

            {/* Note History Section */}
            <NoteHistory />
          </div>
        </div>
      </main>

      <DailyNoteModal 
        isOpen={isNoteModalOpen} 
        onClose={() => setIsNoteModalOpen(false)} 
      />

      <Footer />
    </div>
  );
}