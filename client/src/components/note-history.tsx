import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Play, Trash2 } from "lucide-react";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<{ id: number, content: string } | null>(null);
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
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                      onClick={() => handleDelete(note.id, note.content || "")}
                    >
                      <Trash2 className="h-4 w-4" />
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


    </>
  );
}
