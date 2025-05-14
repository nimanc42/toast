import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { BadgesCard } from "@/components/badges-display";
import { AnalyticsCard } from "@/components/analytics-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, TrendingUp, Activity, ListChecks } from "lucide-react";

type ActivityItem = {
  id: number;
  userId: number;
  activityType: string;
  metadata: Record<string, any>;
  createdAt: string;
};

function getActivityIcon(type: string) {
  switch (type) {
    case 'note-create':
      return <ListChecks className="h-4 w-4 text-green-500" />;
    case 'toast-share':
      return <TrendingUp className="h-4 w-4 text-blue-500" />;
    case 'reaction-received':
      return <Activity className="h-4 w-4 text-purple-500" />;
    case 'badge-earned':
      return <Activity className="h-4 w-4 text-amber-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
}

function getActivityDescription(activity: ActivityItem) {
  const date = new Date(activity.createdAt).toLocaleString();
  
  switch (activity.activityType) {
    case 'note-create':
      return `Created a new note on ${date}`;
    case 'toast-share':
      return `Shared a toast with ${activity.metadata?.visibilityType || 'friends'} on ${date}`;
    case 'reaction-received':
      return `Received a ${activity.metadata?.reaction || 'reaction'} from ${activity.metadata?.fromUser || 'someone'} on ${date}`;
    case 'badge-earned':
      return `Earned the "${activity.metadata?.badgeName || 'Achievement'}" badge on ${date}`;
    default:
      return `${activity.activityType} on ${date}`;
  }
}

function ActivityFeed() {
  const { data, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/gamification/analytics/activity"],
    queryFn: async () => {
      const res = await fetch("/api/gamification/analytics/activity");
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No activity recorded yet. Start using the app to see your activity here!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((activity) => (
        <Card key={activity.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {getActivityIcon(activity.activityType)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.activityType.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getActivityDescription(activity)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Log page view
    if (user) {
      fetch("/api/gamification/analytics/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityType: "page-view",
          metadata: { page: "analytics" }
        }),
      }).catch(error => {
        console.error("Failed to log analytics page view:", error);
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Analytics Dashboard | A Toast to You</title>
        <meta name="description" content="Track your achievements, streaks, and activity in A Toast to You." />
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track your achievements, streaks, and activity
            </p>
          </div>
          
          <Card className="w-full md:w-auto">
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                <AvatarImage src={`https://avatar.vercel.sh/${user?.username}.png`} alt={user?.name} />
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">@{user?.username}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <AnalyticsCard />
          <BadgesCard />
        </div>

        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-6">
            <ActivityFeed />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}