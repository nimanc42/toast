import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, Calendar, Sparkles } from "lucide-react";

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

          {/* Story Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-6 w-6 text-amber-600" />
                Our Story
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed">
                "A Toast" was born from a simple belief: that our daily thoughts and experiences 
                deserve celebration. In a world that often focuses on what went wrong, we wanted 
                to create a space where you could capture what went right - and be reminded of 
                it when you need it most.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                Every week, our AI companion thoughtfully reviews your reflections and creates 
                a personalized audio toast - a warm, encouraging message that celebrates your 
                insights, growth, and unique perspective. It's like having a wise friend who 
                remembers all the good moments and reminds you of your strength.
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

          {/* Values Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
            <CardHeader>
              <CardTitle className="text-2xl">Our Values</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Privacy First</h3>
                  <p className="text-gray-600">
                    Your reflections are private by default. We believe in creating a safe 
                    space for authentic self-expression without judgment.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Authentic Growth</h3>
                  <p className="text-gray-600">
                    We celebrate real experiences and genuine insights, not perfection. 
                    Every reflection matters, no matter how small.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Meaningful Connection</h3>
                  <p className="text-gray-600">
                    Technology should bring us closer to ourselves and each other. 
                    Our AI is designed to understand and celebrate your unique journey.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Joyful Reminder</h3>
                  <p className="text-gray-600">
                    Life is full of beautiful moments worth celebrating. We help you 
                    remember and appreciate the good in your everyday experiences.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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