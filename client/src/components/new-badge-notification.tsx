import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Confetti } from "@/components/ui/confetti";

type UserBadge = {
  id: number;
  userId: number;
  badgeId: number;
  seen: boolean;
  createdAt: string;
  badge: {
    id: number;
    name: string;
    description: string;
    category: string;
    icon: string;
  }
};

export function NewBadgeNotification() {
  const [open, setOpen] = useState(false);
  const [currentBadge, setCurrentBadge] = useState<UserBadge | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const queryClient = useQueryClient();

  // Get unseen badges
  const { data: unseenBadges, refetch } = useQuery<UserBadge[]>({
    queryKey: ["/api/gamification/badges/unseen"],
    refetchInterval: 60000, // Check for new badges every minute
    refetchOnWindowFocus: true,
  });

  // Mark badge as seen
  const markBadgeSeenMutation = useMutation({
    mutationFn: async (badgeId: number) => {
      const res = await apiRequest("PATCH", `/api/gamification/badges/${badgeId}/seen`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/badges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/badges/unseen"] });
    },
  });

  // Check for unseen badges
  useEffect(() => {
    if (unseenBadges && unseenBadges.length > 0 && !open) {
      setCurrentBadge(unseenBadges[0]);
      setOpen(true);
      setShowConfetti(true);
    }
  }, [unseenBadges, open]);

  // Handle dialog close
  const handleClose = () => {
    if (currentBadge) {
      markBadgeSeenMutation.mutate(currentBadge.id);
    }
    setOpen(false);
    setShowConfetti(false);
    
    // Check if there are more badges to show
    setTimeout(() => {
      refetch();
    }, 500);
  };

  return (
    <>
      {showConfetti && <Confetti />}
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-2">
              New Achievement Unlocked!
            </DialogTitle>
            {currentBadge && (
              <div className="flex flex-col items-center justify-center my-4">
                <div className="text-6xl mb-2">
                  {currentBadge.badge.icon}
                </div>
                <h3 className="text-xl font-bold">{currentBadge.badge.name}</h3>
                <DialogDescription className="pt-2">
                  {currentBadge.badge.description}
                </DialogDescription>
                <Badge className="mt-4 capitalize">
                  {currentBadge.badge.category}
                </Badge>
              </div>
            )}
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={handleClose}>
              Awesome!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}