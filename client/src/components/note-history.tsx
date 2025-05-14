import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Pencil, Heart, Play } from "lucide-react";

export default function NoteHistory() {
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();
  
  // Fetch all notes for the user
  const { data: notes, isLoading } = useQuery({
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
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update note",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
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
    // In a real implementation, we would show an edit dialog
    // For this prototype, we'll just show a toast
    toast({
      title: "Edit note",
      description: "Note editing is not fully implemented in this prototype.",
    });
  };
  
  const displayNotes = showAll ? notes : (notes?.slice(0, 3) || []);
  
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
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Your Recent Reflections</CardTitle>
        <CardDescription>Review and edit your previous daily notes</CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {displayNotes.map(note => (
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
  );
}
