import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FlaskConical } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [_, setLocation] = useLocation();
  const { 
    user, 
    loginMutation, 
    registerMutation, 
    enterTestingModeMutation,
    isTestingMode 
  } = useAuth();
  
  // Check if testing mode is available
  const { data: configData } = useQuery<{ testingModeEnabled: boolean }, Error>({
    queryKey: ["/api/config/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  // Testing mode availability flag
  const isTestingModeEnabled = configData?.testingModeEnabled || false;

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  
  // Handle entering testing mode directly without server interaction
  const handleEnterTestingMode = () => {
    // Set testing mode flag in localStorage
    localStorage.setItem('testingMode', 'true');
    
    // Clear any existing authentication
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenExpiry');
    
    // Force page reload to start fresh
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  // Login form setup
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register form setup
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
    },
  });

  // Handle login form submission
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    });
  };

  // Handle register form submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-4xl w-full flex flex-col md:flex-row shadow-lg rounded-xl overflow-hidden">
        <div className="w-full md:w-1/2 flex flex-col justify-center p-8 bg-white">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-2">
              <img src="/logo.jpeg" alt="A Toast Logo" className="h-8 w-8 mr-3 object-contain" />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-accent">
                A Toast
              </h1>
            </div>
            <p className="text-sm text-gray-600">Your daily positivity reflections</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your username" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between items-center">
                    <FormField
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Remember me</FormLabel>
                        </FormItem>
                      )}
                    />
                    <Button 
                      variant="link" 
                      className="p-0 text-sm" 
                      type="button"
                      onClick={() => setLocation('/forgot-password')}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                  
                  {isTestingModeEnabled && (
                    <div className="mt-6 pt-4 border-t">
                      <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                        <AlertDescription className="text-sm text-yellow-800">
                          Testing Mode bypasses normal login and allows unlimited toast generation without saving to the database.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                        onClick={handleEnterTestingMode}
                      >
                        <FlaskConical className="h-4 w-4" />
                        Enter Testing Mode
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Create a username" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Create a password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirm your password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary-600 to-secondary-700 p-8 text-white">
          <div className="h-full flex flex-col justify-center">
            <div className="mb-6 flex justify-center">
              <div className="p-4 bg-white/10 rounded-full">
                <img src="/logo.jpeg" alt="A Toast Logo" className="h-12 w-12 object-contain" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-center font-accent">Celebrate Every Day</h2>
            <p className="text-lg mb-6 text-center">
              A moment of reflection becomes a celebration of growth.
            </p>
            <div className="space-y-4">
              <Card className="bg-white/10 border-0">
                <CardContent className="p-4">
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Daily Reflections</h3>
                      <p className="text-sm text-white/80">
                        Capture positive moments as they happen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-0">
                <CardContent className="p-4">
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Weekly AI Toast</h3>
                      <p className="text-sm text-white/80">
                        Receive personalized audio celebrations of your week
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-0">
                <CardContent className="p-4">
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 16c1.5 0 3-2 3-6s-1.5-6-3-6-3 2-3 6 1.5 6 3 6z"></path>
                        <path d="M19 6c-1.5 0-3 2-3 6s1.5 6 3 6 3-2 3-6-1.5-6-3-6z"></path>
                        <path d="M5 6c-1.5 0-3 2-3 6s1.5 6 3 6 3-2 3-6-1.5-6-3-6z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Custom Voice Styles</h3>
                      <p className="text-sm text-white/80">
                        Choose your preferred voice for a personalized experience
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
