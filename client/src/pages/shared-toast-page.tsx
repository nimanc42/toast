import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart, MessageCircle, ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";

// Types for the shared toast response
interface SharedToastResponse {
  toast: {
    id: number;
    userId: number;
    content: string;
    audioUrl: string | null;
    createdAt: string;
    user: {
      id: number;
      username: string;
      name: string;
    };
  };
  sharedToast: {
    id: number;
    toastId: number;
    shareCode: string;
    visibility: string;
    allowComments: boolean;
    viewCount: number;
    expiresAt: string | null;
    createdAt: string;
  };
}

// Types for reaction and comment
interface Reaction {
  id: number;
  toastId: number;
  userId: number;
  reaction: string;
  createdAt: string;
}

interface Comment {
  id: number;
  toastId: number;
  userId: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    name: string;
  } | null;
}

export default function SharedToastPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  // Fetch the shared toast
  const { data: sharedToastData, isLoading, error } = useQuery<SharedToastResponse>({
    queryKey: [`/api/shared-toasts/${code}`],
    retry: false,
  });

  // Fetch reactions for this toast
  const { data: reactionsData } = useQuery<{
    reactions: Record<string, number>;
    total: number;
    userReaction: string | null;
  }>({
    queryKey: [`/api/toasts/${sharedToastData?.toast.id}/reactions`],
    enabled: !!sharedToastData?.toast.id,
  });

  // Fetch comments for this toast
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/toasts/${sharedToastData?.toast.id}/comments`],
    enabled: !!sharedToastData?.toast.id && sharedToastData?.sharedToast.allowComments,
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ toastId, reaction }: { toastId: number; reaction: string }) => {
      const res = await apiRequest("POST", `/api/toasts/${toastId}/reactions`, { reaction });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/toasts/${sharedToastData?.toast.id}/reactions`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add reaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ toastId, comment }: { toastId: number; comment: string }) => {
      const res = await apiRequest("POST", `/api/toasts/${toastId}/comments`, { comment });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/toasts/${sharedToastData?.toast.id}/comments`],
      });
      setNewComment(""); // Clear the comment input
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle submitting a new comment
  const handleAddComment = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment on this toast",
        variant: "default",
        action: (
          <Button variant="default" size="sm" onClick={() => setLocation("/auth")}>
            Sign In
          </Button>
        ),
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please write something before submitting",
        variant: "destructive",
      });
      return;
    }

    if (sharedToastData) {
      addCommentMutation.mutate({
        toastId: sharedToastData.toast.id,
        comment: newComment,
      });
    }
  };

  // Handle adding a reaction
  const handleReaction = (reaction: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to react to this toast",
        variant: "default",
        action: (
          <Button variant="default" size="sm" onClick={() => setLocation("/auth")}>
            Sign In
          </Button>
        ),
      });
      return;
    }

    if (sharedToastData) {
      addReactionMutation.mutate({
        toastId: sharedToastData.toast.id,
        reaction,
      });
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading shared toast...</p>
      </div>
    );
  }

  // Render error state
  if (error || !sharedToastData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl w-full">
          <Card>
            <CardHeader>
              <CardTitle>Toast Not Found</CardTitle>
              <CardDescription>
                This shared toast may have expired or been removed by the creator.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => setLocation("/")}>Go Home</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Get values from the data
  const { toast: sharedToast, sharedToast: sharedToastMetadata } = sharedToastData;
  const isOwner = user?.id === sharedToast.userId;
  const formattedDate = new Date(sharedToast.createdAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <Button variant="outline" onClick={() => setLocation("/")}>
          &larr; Back to Home
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>{sharedToast.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{sharedToast.user.name}</CardTitle>
                <CardDescription>@{sharedToast.user.username}</CardDescription>
              </div>
            </div>
            <CardDescription>{formattedDate}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <h2 className="text-2xl font-semibold mb-4">Weekly Toast</h2>
          
          {/* Toast content */}
          <div className="prose prose-neutral dark:prose-invert mb-6">
            {sharedToast.content.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          
          {/* Audio player if available */}
          {sharedToast.audioUrl && (
            <div className="my-4">
              <audio controls className="w-full">
                <source src={sharedToast.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
          
          {/* Reactions summary */}
          <div className="flex flex-wrap gap-2 mt-6">
            {reactionsData && Object.entries(reactionsData.reactions).map(([reaction, count]) => (
              <div key={reaction} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm">
                <span>{reaction}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant={reactionsData?.userReaction === "❤️" ? "default" : "outline"}
                size="sm"
                onClick={() => handleReaction("❤️")}
              >
                <Heart className="h-4 w-4 mr-2" />
                Like
              </Button>
              {sharedToastMetadata.allowComments && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("comment-input")?.focus()}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Comment
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={reactionsData?.userReaction === "👍" ? "default" : "outline"}
                size="sm"
                onClick={() => handleReaction("👍")}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Thumbs Up
              </Button>
              <Button
                variant={reactionsData?.userReaction === "👏" ? "default" : "outline"}
                size="sm"
                onClick={() => handleReaction("👏")}
              >
                <span className="mr-2">👏</span>
                Clap
              </Button>
            </div>
          </div>
          
          {/* Share button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({
                title: "Link copied",
                description: "The link to this toast has been copied to your clipboard",
              });
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Copy link to share
          </Button>
        </CardFooter>
      </Card>

      {/* Comments section */}
      {sharedToastMetadata.allowComments && (
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
            <CardDescription>
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comment input */}
            {user && (
              <div className="flex flex-col gap-2 mb-6">
                <Textarea
                  id="comment-input"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAddComment}
                    disabled={addCommentMutation.isPending || !newComment.trim()}
                  >
                    {addCommentMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Comment
                  </Button>
                </div>
              </div>
            )}

            {/* List of comments */}
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No comments yet. Be the first to comment!</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {comment.user?.name.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{comment.user?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}