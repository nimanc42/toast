import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Pencil, Heart, Play, Loader2, Trash2, AlertCircle, MessageCircle, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function NoteHistory() {
  const [showAll, setShowAll] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<{ id: number, content: string } | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Define the Note type
  type Note = {
    id: number;
    content: string;
    audioUrl?: string;
    favorite?: boolean;
    createdAt: string;
    userId: number;
  };

  // Fetch all notes for the user
  const { data: notes, isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });
  
  // Favorite note mutation
  const favoriteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const res = await apiRequest("PUT", `/api/notes/${noteId}`, { favorite: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to favorite note",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Edit note mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number, content: string }) => {
      const res = await apiRequest("PUT", `/api/notes/${id}`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "Note updated",
        description: "Your reflection has been updated.",
      });
      // Close the edit dialog after successful update
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update note",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Reflection deleted",
        description: "Your reflection has been removed.",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete reflection",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Reflection review mutation
  const reviewMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const res = await apiRequest("POST", `/api/notes/${noteId}/review`);
      const data = await res.json();
      return data.review;
    },
    onSuccess: (review) => {
      setReviewContent(review);
      setIsReviewing(false);
      setReviewDialogOpen(true);
      // Reset audio state when opening a new review
      setAudioUrl(null);
      setIsPlayingAudio(false);
    },
    onError: (error: Error) => {
      setIsReviewing(false);
      toast({
        title: "Review generation failed",
        description: "Unable to generate a review for your reflection.",
        variant: "destructive",
      });
    }
  });
  
  // Text-to-speech mutation for reading reviews aloud
  const ttsMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/tts/review", { text });
      const data = await res.json();
      return data.audioUrl;
    },
    onSuccess: (url) => {
      setAudioUrl(url);
      playAudio(url);
    },
    onError: (error: Error) => {
      console.error("TTS error:", error);
      toast({
        title: "Voice generation failed",
        description: "Unable to generate voice for this review. Please try again.",
        variant: "destructive",
      });
      setIsPlayingAudio(false);
    }
  });
  
  // Function to play audio with the review content
  const playAudio = (url: string) => {
    // Create or get the audio element
    let audioElement = document.getElementById("reviewAudio") as HTMLAudioElement;
    
    if (!audioElement) {
      audioElement = document.createElement("audio");
      audioElement.id = "reviewAudio";
      audioElement.style.display = "none";
      document.body.appendChild(audioElement);
    }
    
    // Set up event listeners
    audioElement.onended = () => {
      setIsPlayingAudio(false);
    };
    
    audioElement.onerror = () => {
      setIsPlayingAudio(false);
      toast({
        title: "Audio playback error",
        description: "There was an error playing the audio.",
        variant: "destructive",
      });
    };
    
    // Set source and play
    audioElement.src = url;
    audioElement.play()
      .then(() => {
        setIsPlayingAudio(true);
      })
      .catch(err => {
        console.error("Playback error:", err);
        setIsPlayingAudio(false);
        toast({
          title: "Audio playback failed",
          description: err.message,
          variant: "destructive",
        });
      });
  };
  
  // Read the reflection review aloud
  const handleReadAloud = () => {
    if (isPlayingAudio && audioUrl) {
      // Stop the current audio if playing
      const audioElement = document.getElementById("reviewAudio") as HTMLAudioElement;
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setIsPlayingAudio(false);
    } else if (audioUrl) {
      // Play existing audio if available
      playAudio(audioUrl);
    } else if (reviewContent) {
      // Generate new audio if no audio is available
      ttsMutation.mutate(reviewContent);
    }
  };
  
  // Handle requesting a reflection review
  const handleRequestReview = (note: Note) => {
    setCurrentNote({ id: note.id, content: note.content });
    setIsReviewing(true);
    reviewMutation.mutate(note.id);
  };

  // Handle audio playback
  const handlePlayAudio = (audioUrl: string) => {
    // In a real implementation, we would play the audio file here
    toast({
      title: "Audio playback",
      description: "Audio playback is not implemented in this prototype.",
    });
  };
  
  // Handle favorite toggle
  const handleFavorite = (id: number) => {
    favoriteMutation.mutate(id);
  };
  
  // Handle edit click
  const handleEdit = (id: number, content: string) => {
    setCurrentNote({ id, content });
    setEditedContent(content);
    setEditDialogOpen(true);
  };
  
  // Handle delete click
  const handleDelete = (id: number, content: string) => {
    setCurrentNote({ id, content });
    setDeleteDialogOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (!currentNote) return;
    deleteMutation.mutate(currentNote.id);
  };
  
  // Handle saving edited note
  const handleSaveEdit = () => {
    if (!currentNote) return;
    
    if (!editedContent.trim()) {
      toast({
        title: "Empty reflection",
        description: "Please enter some text for your reflection.",
        variant: "destructive",
      });
      return;
    }
    
    editMutation.mutate({ 
      id: currentNote.id, 
      content: editedContent 
    });
  };
  
  // Close the edit dialog
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setCurrentNote(null);
    setEditedContent("");
  };
  
  // Ensure we have a proper array of notes to work with
  const notesArray = notes || [];
  const displayNotes = showAll ? notesArray : notesArray.slice(0, 3);
  
  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Your Recent Reflections</CardTitle>
          <CardDescription>Review and edit your previous daily notes</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Empty state
  if (!notes || notes.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Your Recent Reflections</CardTitle>
          <CardDescription>Review and edit your previous daily notes</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="py-6">
            <h3 className="text-lg font-medium text-gray-900 mb-1">No reflections yet</h3>
            <p className="text-gray-500 mb-4">
              Start adding daily reflections to see them here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Your Recent Reflections</CardTitle>
          <CardDescription>Review and edit your previous daily notes</CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-4">
            {displayNotes.map((note: Note) => (
              <div 
                key={note.id} 
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition duration-150"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {format(new Date(note.createdAt), "EEEE, MMMM d")}
                    </p>
                    
                    {note.audioUrl ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <Button 
                          onClick={() => handlePlayAudio(note.audioUrl!)}
                          variant="secondary"
                          size="icon"
                          className="w-6 h-6 rounded-full bg-secondary-100 text-secondary-600"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <div className="h-4 bg-gray-200 rounded-full flex-grow">
                          <div className="bg-secondary-400 h-full rounded-full" style={{ width: "35%" }}></div>
                        </div>
                        <span className="text-xs text-gray-500">0:42</span>
                      </div>
                    ) : (
                      <p className="text-gray-700">{note.content}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-secondary-500"
                      onClick={() => handleEdit(note.id, note.content || "")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-amber-500"
                      onClick={() => handleRequestReview(note)}
                      disabled={isReviewing && currentNote?.id === note.id}
                    >
                      {isReviewing && currentNote?.id === note.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                      onClick={() => handleDelete(note.id, note.content || "")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className={`h-8 w-8 ${note.favorite ? 'text-accent-500' : 'text-gray-400 hover:text-accent-500'}`}
                      onClick={() => handleFavorite(note.id)}
                    >
                      <Heart className="h-4 w-4" fill={note.favorite ? "currentColor" : "none"} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {notes.length > 3 && (
              <div className="text-center pt-4">
                <Button 
                  variant="link"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Show Less" : "View All Reflections"} 
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-3 w-3 ml-1 transition-transform ${showAll ? 'rotate-180' : ''}`} 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Reflection Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Reflection</DialogTitle>
            <DialogDescription>
              Update your reflection for {currentNote && format(new Date(notesArray.find(n => n.id === currentNote?.id)?.createdAt || new Date()), "EEEE, MMMM d")}
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Textarea
              placeholder="Update your reflection here..."
              rows={4}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="mb-4"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Delete Reflection
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reflection? This action cannot be undone.
              {currentNote && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-700">
                  <p className="text-sm italic">{currentNote.content}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reflection Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
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
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleReadAloud}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              disabled={ttsMutation.isPending || !reviewContent}
            >
              {isPlayingAudio ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Playing...
                </>
              ) : ttsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Read Aloud
                </>
              )}
            </Button>
            <Button 
              onClick={() => setReviewDialogOpen(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
