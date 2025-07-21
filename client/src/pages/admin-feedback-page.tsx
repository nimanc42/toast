
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Calendar, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FeedbackItem {
  id: number;
  text: string;
  audioUrl?: string;
  createdAt: string;
  userId?: number;
}

export default function AdminFeedbackPage() {
  const { data: feedback, isLoading, error } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      return await apiRequest("GET", "/api/admin/feedback") as FeedbackItem[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
              <p className="mt-2 text-gray-600">You don't have permission to view this page.</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Beta Feedback - Admin | A Toast to You</title>
        <meta name="description" content="View and manage beta feedback submissions." />
      </Helmet>
      
      <Header />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Beta Feedback</h1>
            <p className="mt-2 text-gray-600">
              Anonymous feedback submissions from users.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading feedback...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {feedback && feedback.length > 0 ? (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Total Submissions: {feedback.length}</span>
                      </div>
                      <Badge variant="secondary">
                        Latest: {new Date(feedback[0]?.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    {feedback.map((item) => (
                      <Card key={item.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Feedback #{item.id}</CardTitle>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Text Feedback */}
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Written Feedback:</h4>
                              <ScrollArea className="h-auto max-h-48">
                                <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-wrap">
                                  {item.text || "No written feedback provided."}
                                </div>
                              </ScrollArea>
                            </div>

                            {/* Audio Feedback */}
                            {item.audioUrl && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Audio Feedback:</h4>
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <Badge variant="outline" className="text-blue-700">
                                    Audio feedback recorded
                                  </Badge>
                                  <p className="text-sm text-blue-600 mt-1">
                                    Note: Audio playback not implemented in admin view
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Metadata */}
                            <Separator />
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span>Anonymous User</span>
                              </div>
                              <div>
                                Submission ID: {item.id}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Yet</h3>
                  <p className="text-gray-600">
                    No beta feedback submissions have been received yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </>
  );
}
