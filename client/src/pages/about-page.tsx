
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, Calendar, Sparkles, Coffee } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              About A Toast
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your personal companion for daily reflection and weekly celebration
            </p>
          </div>

          {/* Main Story Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
            <CardContent className="prose prose-lg max-w-none pt-6">
              <p className="text-gray-700 leading-relaxed">
                Humans are brilliant, but let's be honest, we're naturally a bit… negative.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                We tend to dwell on what went wrong, what we could have done better, and what's 
                still left undone. That's not a flaw, it's survival instinct. But in a world where 
                the pace is fast and the criticism louder than kindness, sometimes we forget to 
                build ourselves up.
              </p>
              
              <p className="text-gray-700 leading-relaxed font-medium">
                That's where A Toast comes in.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                A Toast is a gentle daily ritual designed to help you reflect on what's good. 
                Whether it's something small you did well, something kind someone said, or just 
                a moment you want to remember—it all adds up. At the end of the week, you'll get 
                a personalised toast. A celebration of you, in your chosen voice.
              </p>
            </CardContent>
          </Card>

          {/* Why's it called A Toast? Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Coffee className="h-6 w-6 text-amber-600" />
                Why's it called A Toast?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold text-lg">•</span>
                  <span>Because like the best speeches at weddings and parties, it's about lifting someone up with kind words and this time, that someone is you.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold text-lg">•</span>
                  <span>Because if life is our daily bread, then a toast is what happens when you warm it up and add a bit of butter on top.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold text-lg">•</span>
                  <span>Because it's rare that we hear good things about ourselves. But when we do, it sticks. It heals. And it matters.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* And also... Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
            <CardHeader>
              <CardTitle className="text-2xl">And also…</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed mb-4">
                We just really wanted to see a piece of toast holding a champagne glass and doing a toast.
              </p>
              <p className="text-gray-700 leading-relaxed font-medium">
                I bet you never thought you'd see that when you woke up this morning.
              </p>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Daily Reflection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Capture your thoughts, experiences, and insights through simple text 
                  or voice recordings. Create a personal archive of your journey.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Weekly Toasts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Receive personalized audio messages that celebrate your week's 
                  reflections. Choose from different voices and styles that resonate with you.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Community
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Connect with friends, share meaningful toasts, and support each other's 
                  growth journey while maintaining privacy and authenticity.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Ready to Start Your Journey?
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Begin capturing your daily reflections today and receive your first 
              personalized toast this week. Your story matters, and we're here to help you celebrate it.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
