import { useAuth } from "@/hooks/use-auth";
import { Helmet } from "react-helmet";
import Header from "@/components/header";

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <>
      <Helmet>
        <title>About A Toast - A Toast To You</title>
        <meta name="description" content="Learn about A Toast - a gentle daily ritual designed to help you reflect on what's good and celebrate yourself with personalized weekly toasts." />
      </Helmet>
      
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                🥂 About A Toast
              </h1>
            </div>

            {/* Main Content */}
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
              <p className="text-xl mb-6">
                Humans are brilliant, but let's be honest, we're naturally a bit… negative.
              </p>

              <p className="mb-6">
                We tend to dwell on what went wrong, what we could have done better, and what's still left undone. That's not a flaw it's survival instinct. But in a world where the pace is fast and the criticism louder than kindness, sometimes we forget to build ourselves up.
              </p>

              <p className="mb-6">
                <strong>That's where A Toast comes in.</strong>
              </p>

              <p className="mb-6">
                A Toast is a gentle daily ritual designed to help you reflect on what's good. Whether it's something small you did well, something kind someone said, or just a moment you want to remember it all adds up. At the end of the week, you'll get a personalised toast. A celebration of you, in your chosen voice.
              </p>

              {/* Why's it called A Toast section */}
              <div className="bg-amber-50 rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Why's it called A Toast?
                </h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-3 text-lg">•</span>
                    <span>Because like the best speeches at weddings and parties, it's about lifting someone up with kind words and this time, that someone is you.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-3 text-lg">•</span>
                    <span>If life is our daily bread, then toast is what happens when you warm it up and cover it in butter.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-3 text-lg">•</span>
                    <span>Because it's rare that we hear good things about ourselves. But when we do, it sticks. It heals. And it matters.</span>
                  </li>
                </ul>
              </div>

              {/* Final section */}
              <div className="text-center bg-orange-50 rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  And also…
                </h2>
                <p className="mb-3">
                  We just really wanted to see a piece of toast holding a champagne glass and doing a toast.
                </p>
                <p className="text-gray-600 italic">
                  I bet you never thought you'd see that when you woke up this morning.
                </p>
              </div>
            </div>

            {/* Call to Action */}
            {!user && (
              <div className="mt-8 text-center">
                <p className="text-gray-600 mb-4">Ready to start your journey of self-celebration?</p>
                <a 
                  href="/auth" 
                  className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
                >
                  Get Started
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}