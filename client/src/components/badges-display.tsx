import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Award, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";

type UserBadge = {
  id: number;
  userId: number;
  badgeId: number;
  seen: boolean;
  awardedAt: string;
  badge: {
    id: number;
    name: string;
    description: string;
    category: string;
    icon: string;
  }
};

export function BadgesDisplay() {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  
  const { data: badges, isLoading, error } = useQuery({
    queryKey: ["/api/gamification/badges"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Unable to load badges. Please try again later.
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="p-4 text-center">
        <Award className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">You haven't earned any badges yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Keep using the app to earn achievements!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
        {badges.map((badge: UserBadge) => (
          <TooltipProvider key={badge.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-12 w-12 p-0 hover:scale-105 transition-transform"
                      onClick={() => setSelectedBadge(badge)}
                    >
                      <span className="text-2xl" role="img" aria-label={badge.badge.name}>
                        {badge.badge.icon}
                      </span>
                    </Button>
                  </DialogTrigger>
                  {selectedBadge && (
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <span className="text-2xl" role="img" aria-label={selectedBadge.badge.name}>
                            {selectedBadge.badge.icon}
                          </span>
                          {selectedBadge.badge.name}
                        </DialogTitle>
                        <DialogDescription>
                          {selectedBadge.badge.description}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-between items-center mt-4">
                        <Badge variant="outline" className="capitalize">
                          {selectedBadge.badge.category}
                        </Badge>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Earned {new Date(selectedBadge.awardedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </DialogContent>
                  )}
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>
                <p>{badge.badge.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

export function BadgesCard() {
  const { data: badgesData } = useQuery({
    queryKey: ["/api/gamification/badges"],
  });

  const badges = badgesData || [];
  
  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
            <CardDescription>Badges you've earned through your journey</CardDescription>
          </div>
          <Badge variant="outline">{badges.length || 0}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <BadgesDisplay />
      </CardContent>
    </Card>
  );
}