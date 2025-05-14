import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Header from "@/components/header";
import Footer from "@/components/footer";
import DailyNoteModal from "@/components/daily-note-modal";
import NoteHistory from "@/components/note-history";
import FriendsList from "@/components/friends-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function HomePage() {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats"],
    refetchOnWindowFocus: true
  });

  // Fetch today's note to check if user has added a note today
  const { data: todayNotes, isLoading: isLoadingTodayNote } = useQuery({
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
                          Today's Toast
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Toast Preview */}
            <div className="bg-gradient-to-r from-secondary-500 to-primary-600 overflow-hidden shadow rounded-lg mb-6 text-white">
              <div className="px-4 py-8 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-white bg-opacity-20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                        <line x1="6" y1="1" x2="6" y2="4"></line>
                        <line x1="10" y1="1" x2="10" y2="4"></line>
                        <line x1="14" y1="1" x2="14" y2="4"></line>
                      </svg>
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold font-accent mb-2">Your Weekly Toast</h2>
                  <p className="mb-6 max-w-md">
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
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                      {/* Progress circle */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="8" 
                        strokeDasharray={2 * Math.PI * 45} 
                        strokeDashoffset={calculateStrokeDashoffset(progressPercentage)} 
                        transform="rotate(-90 50 50)" 
                      />
                      <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="white">
                        {stats?.weeklyNotesCount || 0}/{stats?.totalNotesNeeded || 7}
                      </text>
                    </svg>
                  </div>
                  
                  <Button 
                      variant="secondary" 
                      className="bg-white text-primary-700 hover:bg-white/90"
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
