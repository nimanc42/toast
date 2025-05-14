import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Check } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

interface ShareToastProps {
  toast: {
    id: number;
    shared: boolean;
    shareUrl?: string | null;
  };
}

export default function ShareToast({ toast }: ShareToastProps) {
  const { toast: showToast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "friends-only">(
    "friends-only"
  );
  const [allowComments, setAllowComments] = useState(true);
  const [expiration, setExpiration] = useState<"never" | "1day" | "1week" | "1month">("never");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Share toast mutation
  const shareToastMutation = useMutation({
    mutationFn: async () => {
      // Calculate expiration date based on selection
      let expiresAt: Date | null = null;
      if (expiration !== "never") {
        expiresAt = new Date();
        if (expiration === "1day") {
          expiresAt.setDate(expiresAt.getDate() + 1);
        } else if (expiration === "1week") {
          expiresAt.setDate(expiresAt.getDate() + 7);
        } else if (expiration === "1month") {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }
      }

      const res = await apiRequest("POST", `/api/toasts/${toast.id}/share`, {
        visibility,
        allowComments,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Generate the full URL for sharing
      const shareCode = data.shareCode;
      const shareUrl = `${window.location.origin}/shared/${shareCode}`;
      setShareLink(shareUrl);
      
      // Invalidate the toast query to update its shared status
      queryClient.invalidateQueries({ queryKey: ["/api/toasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toasts/latest"] });
    },
    onError: (error: Error) => {
      showToast({
        title: "Failed to share toast",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unshare toast mutation (delete all shared toasts for this toast)
  const unshareToastMutation = useMutation({
    mutationFn: async () => {
      // First get all shared toast records
      const res = await apiRequest("GET", "/api/shared-toasts");
      const sharedToasts = await res.json();
      
      // Filter for the ones related to this toast
      const toDelete = sharedToasts.filter((st: any) => st.toastId === toast.id);
      
      // Delete each shared toast
      await Promise.all(
        toDelete.map((st: any) => 
          apiRequest("DELETE", `/api/shared-toasts/${st.id}`)
        )
      );
    },
    onSuccess: () => {
      setIsOpen(false);
      showToast({
        title: "Toast unshared",
        description: "Your toast is no longer shared with anyone",
      });
      
      // Invalidate the toast query to update its shared status
      queryClient.invalidateQueries({ queryKey: ["/api/toasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toasts/latest"] });
    },
    onError: (error: Error) => {
      showToast({
        title: "Failed to unshare toast",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Copy link to clipboard
  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      
      showToast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    }
  };

  // Handle modal close
  const handleClose = () => {
    setIsOpen(false);
    
    // Reset state if the dialog is closed without copying
    if (shareToastMutation.isSuccess && !copied) {
      setShareLink(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={toast.shared ? "default" : "outline"} 
          className="gap-2"
          onClick={() => {
            setShareLink(null);
            setIsOpen(true);
          }}
        >
          <Share2 className="h-4 w-4" />
          {toast.shared ? "Manage Sharing" : "Share Toast"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {shareLink 
              ? "Share Your Toast" 
              : toast.shared 
              ? "Manage Toast Sharing" 
              : "Share Your Toast"
            }
          </DialogTitle>
          <DialogDescription>
            {shareLink 
              ? "Copy this link to share your toast with others."
              : "Choose how you want to share your weekly toast with others."
            }
          </DialogDescription>
        </DialogHeader>
        
        {shareLink ? (
          // Show the share link UI
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="link" className="sr-only">
                  Share link
                </Label>
                <Input
                  id="link"
                  readOnly
                  value={shareLink}
                  className="w-full"
                />
              </div>
              <Button 
                size="sm" 
                className="px-3" 
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy</span>
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground mt-2">
              <p>Anyone with this link can view your toast.</p>
              {expiration !== "never" && (
                <p className="mt-1">
                  This link will expire in {expiration === "1day" 
                    ? "24 hours" 
                    : expiration === "1week" 
                    ? "7 days" 
                    : "30 days"
                  }.
                </p>
              )}
            </div>
          </div>
        ) : (
          // Show the share settings UI
          <div className="grid gap-4 py-4">
            {toast.shared ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Your toast is currently shared. You can create a new sharing link with different settings or unshare it completely.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={() => unshareToastMutation.mutate()}
                  disabled={unshareToastMutation.isPending}
                >
                  {unshareToastMutation.isPending ? "Removing..." : "Remove Sharing"}
                </Button>
                <Separator className="my-2" />
              </div>
            ) : null}
            
            <div className="space-y-2">
              <Label htmlFor="visibility">Who can see your toast?</Label>
              <RadioGroup 
                id="visibility" 
                value={visibility} 
                onValueChange={(value) => setVisibility(value as "public" | "friends-only")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="friends-only" id="friends-only" />
                  <Label htmlFor="friends-only">Friends only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public">Anyone with the link</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiration">Link expiration</Label>
              <Select 
                value={expiration} 
                onValueChange={(value) => setExpiration(value as any)}
              >
                <SelectTrigger id="expiration">
                  <SelectValue placeholder="Select when the link expires" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="1day">Expires in 24 hours</SelectItem>
                  <SelectItem value="1week">Expires in 7 days</SelectItem>
                  <SelectItem value="1month">Expires in 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="comments" className="flex-1">
                Allow comments
              </Label>
              <Switch
                id="comments"
                checked={allowComments}
                onCheckedChange={setAllowComments}
              />
            </div>
          </div>
        )}
        
        <DialogFooter className="sm:justify-between">
          {shareLink ? (
            <Button 
              variant="secondary" 
              onClick={handleClose}
            >
              Done
            </Button>
          ) : (
            <Button 
              type="submit" 
              onClick={() => shareToastMutation.mutate()}
              disabled={shareToastMutation.isPending}
            >
              {shareToastMutation.isPending ? "Creating link..." : "Create share link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}