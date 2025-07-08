import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mic, MicOff, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function BetaFeedbackPage() {
  const [textFeedback, setTextFeedback] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ text, audioUrl }: { text: string; audioUrl?: string }) => {
      return await apiRequest("POST", "/api/feedback", { text, audioUrl });
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your anonymous feedback! It helps us improve the app.",
      });
      // Reset form
      setTextFeedback("");
      setAudioBlob(null);
      setAudioUrl(null);
    },
    onError: (error) => {
      toast({
        title: "Error submitting feedback",
        description: "There was an error submitting your feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record audio feedback.",
        variant: "destructive",
      });
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Play/pause audio preview
  const toggleAudioPlayback = () => {
    if (!audioUrl) return;

    const audio = document.getElementById("audio-preview") as HTMLAudioElement;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Submit feedback
  const handleSubmitFeedback = () => {
    if (!textFeedback.trim() && !audioBlob) {
      toast({
        title: "No feedback provided",
        description: "Please provide either text or audio feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    // For now, we'll submit without uploading audio to a storage service
    // In a real implementation, you'd upload the audio file first
    submitFeedbackMutation.mutate({
      text: textFeedback.trim(),
      audioUrl: audioBlob ? "audio-feedback-recorded" : undefined
    });
  };

  return (
    <>
      <Helmet>
        <title>Beta Feedback | A Toast to You</title>
        <meta name="description" content="Share anonymous feedback to help us improve A Toast to You." />
      </Helmet>
      
      <Header />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Beta Feedback</h1>
            <p className="mt-2 text-gray-600">
              Help us improve the app by sharing your thoughts and suggestions.
            </p>
          </div>

          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              <strong>Privacy Notice:</strong> This feedback is 100% anonymous and cannot be traced back to you.
              Your input helps us make the app better for everyone.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Share Your Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Text Feedback */}
              <div>
                <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 mb-2">
                  Written Feedback
                </label>
                <Textarea
                  id="feedback-text"
                  placeholder="Share your thoughts, suggestions, or report any issues you've encountered..."
                  value={textFeedback}
                  onChange={(e) => setTextFeedback(e.target.value)}
                  rows={6}
                  className="w-full"
                />
              </div>

              {/* Audio Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Feedback (Optional)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {!isRecording ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={startRecording}
                        className="flex items-center space-x-2"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Start Recording</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={stopRecording}
                        className="flex items-center space-x-2"
                      >
                        <MicOff className="h-4 w-4" />
                        <span>Stop Recording</span>
                      </Button>
                    )}
                    
                    {isRecording && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                        <span className="text-sm">Recording...</span>
                      </div>
                    )}
                  </div>

                  {/* Audio Preview */}
                  {audioUrl && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleAudioPlayback}
                        className="flex items-center space-x-1"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span>{isPlaying ? "Pause" : "Play"}</span>
                      </Button>
                      <span className="text-sm text-gray-600">Audio feedback recorded</span>
                      <audio
                        id="audio-preview"
                        src={audioUrl}
                        onEnded={handleAudioEnded}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submitFeedbackMutation.isPending || (!textFeedback.trim() && !audioBlob)}
                  className="w-full"
                >
                  {submitFeedbackMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting Feedback...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </>
  );
}