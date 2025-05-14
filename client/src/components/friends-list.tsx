import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Check, X, Loader2, UserX } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// User type definition
interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

// Friendship type definition
interface Friendship {
  id: number;
  userId: number;
  friendId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function FriendsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [username, setUsername] = useState("");

  // Fetch friends
  const { data: allFriendships = [] } = useQuery<Friendship[]>({
    queryKey: ['/api/friends'],
  });

  // Fetch friend users data
  const { data: acceptedFriends = [] } = useQuery<User[]>({
    queryKey: ['/api/friends', 'accepted'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/friends?status=accepted");
      return await res.json();
    },
  });

  // Fetch friend requests (pending friendships)
  const pendingFriendships = allFriendships.filter(f => f.status === 'pending');

  // Mutations
  const addFriendMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiRequest("POST", "/api/friends", { username });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      setUsername("");
      setAddFriendOpen(false);
      toast({
        title: "Friend request sent",
        description: "They'll be notified of your request",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFriendshipMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PUT", `/api/friends/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update friendship",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFriendshipMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/friends/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      toast({
        title: "Friend removed",
        description: "The friendship has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove friend",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle add friend form submission
  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to add a friend",
        variant: "destructive",
      });
      return;
    }
    addFriendMutation.mutate(username);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Your Friends</CardTitle>
          <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Friend
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Friend</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddFriend} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter their username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={addFriendMutation.isPending || !username.trim()}
                  >
                    {addFriendMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Send Friend Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Connect with others to share your weekly toasts</CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="friends">
          <div className="px-6">
            <TabsList className="w-full">
              <TabsTrigger value="friends" className="flex-1">
                Friends ({acceptedFriends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1">
                Requests ({pendingFriendships.length})
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="friends" className="pt-2">
            {acceptedFriends.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-muted-foreground">You don't have any friends yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add friends to share your weekly toasts with them.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {acceptedFriends.map((friend) => (
                  <div key={friend.id} className="px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.name}</p>
                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const friendship = allFriendships.find(
                          f => (f.userId === friend.id || f.friendId === friend.id) && f.status === 'accepted'
                        );
                        if (friendship) {
                          deleteFriendshipMutation.mutate(friendship.id);
                        }
                      }}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="requests" className="pt-2">
            {pendingFriendships.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-muted-foreground">No pending friend requests.</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingFriendships.map((friendship) => {
                  // Determine if this is an incoming or outgoing request
                  const isIncoming = friendship.friendId === (queryClient.getQueryData(['/api/user']) as User)?.id;
                  
                  return (
                    <div key={friendship.id} className="px-6 py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {isIncoming 
                              ? `@${allFriendships.find(f => f.id === friendship.id)?.userId}` 
                              : `@${allFriendships.find(f => f.id === friendship.id)?.friendId}`
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isIncoming ? 'Sent you a friend request' : 'Friend request sent'}
                          </p>
                        </div>
                        
                        {isIncoming ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateFriendshipMutation.mutate({ 
                                id: friendship.id, 
                                status: 'accepted' 
                              })}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateFriendshipMutation.mutate({ 
                                id: friendship.id, 
                                status: 'rejected' 
                              })}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFriendshipMutation.mutate(friendship.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}