import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CalendarClock, Share2, ThumbsUp, Pencil, Award, Trophy } from "lucide-react";

type AnalyticsSummary = {
  streak: number;
  badgesCount: number;
  activity: {
    notes: {
      weekly: number;
      monthly: number;
    };
    shares: {
      weekly: number;
      monthly: number;
    };
    reactions: {
      weekly: number;
      monthly: number;
    };
  };
};

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  progress
}: { 
  title: string; 
  value: number | string; 
  description: string;
  icon: any;
  progress?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {progress !== undefined && (
          <div className="mt-3 relative">
            <div className="text-xs font-medium mb-1">
              {Math.round(progress)}% Complete
            </div>
            <Progress 
              value={progress} 
              className={`h-3 ${title.includes("Streak") ? "bg-amber-200 dark:bg-amber-900" : "bg-purple-200 dark:bg-purple-900"}`}
              progressColor={title.includes("Streak") ? "bg-amber-500 dark:bg-amber-400" : "bg-purple-600 dark:bg-purple-400"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const { data, isLoading, error } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/gamification/analytics/summary"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Unable to load analytics. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Notes Created"
              value={data.activity.notes.weekly}
              description="Notes created this week"
              icon={Pencil}
            />
            <StatCard
              title="Toasts Shared"
              value={data.activity.shares.weekly}
              description="Toasts shared with friends this week"
              icon={Share2}
            />
            <StatCard
              title="Reactions Received"
              value={data.activity.reactions.weekly}
              description="Reactions on your shared toasts this week"
              icon={ThumbsUp}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Notes Created"
              value={data.activity.notes.monthly}
              description="Notes created this month"
              icon={Pencil}
            />
            <StatCard
              title="Toasts Shared"
              value={data.activity.shares.monthly}
              description="Toasts shared with friends this month"
              icon={Share2}
            />
            <StatCard
              title="Reactions Received"
              value={data.activity.reactions.monthly}
              description="Reactions on your shared toasts this month"
              icon={ThumbsUp}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <StatCard
          title="Current Streak"
          value={data.streak}
          description="Consecutive days with notes"
          icon={CalendarClock}
          progress={Math.min(100, (data.streak / 30) * 100)}
        />
        <StatCard
          title="Badges Earned"
          value={data.badgesCount}
          description="Achievements unlocked"
          icon={Award}
          progress={Math.min(100, (data.badgesCount / 10) * 100)}
        />
      </div>
    </div>
  );
}

export function AnalyticsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Your Progress
        </CardTitle>
        <CardDescription>
          Track your activity and accomplishments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnalyticsDashboard />
      </CardContent>
    </Card>
  );
}