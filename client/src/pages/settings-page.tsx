import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertVoicePreferenceSchema } from "@shared/schema";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Create a schema for the form
const settingsFormSchema = z.object({
  toastDay: z.enum(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
  toastTone: z.enum(["auto", "uplifting", "reflective", "humorous"]),
  dailyReminder: z.boolean().default(true),
  toastNotification: z.boolean().default(true),
  emailNotifications: z.boolean().default(false),
  timezone: z.string().default("UTC"),
  weeklyToastDay: z.number().min(0).max(6).default(0),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  
  // Define types for API responses
  type VoicePreferencesResponse = {
    toastDay: string;
    toastTone: string;
    dailyReminder: boolean;
    toastNotification: boolean;
    emailNotifications: boolean;
  };
  
  type UserSettingsResponse = {
    timezone: string;
    weeklyToastDay: number;
  };
  
  // Fetch user voice preferences
  const { data: voicePreferences, isLoading: isLoadingVoicePrefs } = useQuery<VoicePreferencesResponse>({
    queryKey: ["/api/preferences"],
  });
  
  // Fetch user settings (timezone and weekly toast day)
  const { data: userSettings, isLoading: isLoadingSettings } = useQuery<UserSettingsResponse>({
    queryKey: ["/api/user/settings"],
  });
  
  // Setup form with default values from fetched preferences
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      toastDay: "Sunday",
      toastTone: "auto",
      dailyReminder: true,
      toastNotification: true,
      emailNotifications: false,
      timezone: "UTC",
      weeklyToastDay: 0, // Sunday
    },
  });
  
  // Update form values when preferences are loaded
  useEffect(() => {
    // Only update when both sets of data are available
    if (voicePreferences && userSettings) {
      const safeVoiceStyle = (voicePreferences.voiceStyle || "motivational") as "motivational" | "friendly" | "poetic" | "david";
      const safeToastDay = (voicePreferences.toastDay || "Sunday") as "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
      const safeToastTone = (voicePreferences.toastTone || "auto") as "auto" | "uplifting" | "reflective" | "humorous";
      
      form.reset({
        // Voice preferences
        voiceStyle: safeVoiceStyle,
        toastDay: safeToastDay,
        toastTone: safeToastTone,
        dailyReminder: voicePreferences.dailyReminder ?? true,
        toastNotification: voicePreferences.toastNotification ?? true,
        emailNotifications: voicePreferences.emailNotifications ?? false,
        
        // User settings (timezone and weekly toast day)
        timezone: userSettings.timezone || "UTC",
        weeklyToastDay: userSettings.weeklyToastDay ?? 0,
      });
    }
  }, [voicePreferences, userSettings, form]);
  
  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      // First update voice preferences
      const voicePrefsRes = await apiRequest("PUT", "/api/preferences", {
        voiceStyle: values.voiceStyle,
        toastDay: values.toastDay,
        toastTone: values.toastTone,
        dailyReminder: values.dailyReminder,
        toastNotification: values.toastNotification,
        emailNotifications: values.emailNotifications,
      });
      
      // Then update user settings (timezone and weekly toast day)
      const userSettingsRes = await apiRequest("PUT", "/api/user/settings", {
        timezone: values.timezone,
        weeklyToastDay: values.weeklyToastDay,
      });
      
      // Return combined data
      return {
        voicePreferences: await voicePrefsRes.json(),
        userSettings: await userSettingsRes.json()
      };
    },
    onSuccess: () => {
      // Invalidate both queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: SettingsFormValues) => {
    updateMutation.mutate(values);
  };
  
  // Play voice sample
  const playVoiceSample = () => {
    toast({
      title: "Voice samples",
      description: "Voice sample playback is not implemented in this prototype.",
    });
  };
  
  const isLoading = isLoadingVoicePrefs || isLoadingSettings;
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  {/* Voice Preferences Section */}
                  {/* Weekly Toast Automation Section */}
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-blue-50">
                    <h2 className="text-lg font-medium text-gray-900">Weekly Toast Automation</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Your weekly toast is now automatically generated! Set your preferences below to control when it happens.
                    </p>
                  </div>
                  
                  <div className="px-4 py-5 sm:p-6 border-b border-gray-200 bg-blue-50">
                    <div className="space-y-6">
                      {/* Weekly Toast Day Preference */}
                      <FormField
                        control={form.control}
                        name="weeklyToastDay"
                        render={({ field }) => (
                          <FormItem className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                            <FormLabel className="text-blue-700 font-medium">Weekly Toast Day</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value.toString()}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a day" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Sunday</SelectItem>
                                  <SelectItem value="1">Monday</SelectItem>
                                  <SelectItem value="2">Tuesday</SelectItem>
                                  <SelectItem value="3">Wednesday</SelectItem>
                                  <SelectItem value="4">Thursday</SelectItem>
                                  <SelectItem value="5">Friday</SelectItem>
                                  <SelectItem value="6">Saturday</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              Your weekly toast will be automatically generated on this day of the week
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Timezone Selection - Highlighted */}
                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                            <FormLabel className="text-blue-700 font-medium">Your Timezone</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select your timezone" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {(() => {
                                    // Get timezones available in the browser
                                    try {
                                      return Intl.supportedValuesOf('timeZone').map(tz => (
                                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                      ));
                                    } catch (e) {
                                      // Fallback for browsers that don't support Intl.supportedValuesOf
                                      return [
                                        "UTC", "America/New_York", "America/Chicago", 
                                        "America/Denver", "America/Los_Angeles", "Europe/London",
                                        "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"
                                      ].map(tz => (
                                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                      ));
                                    }
                                  })()}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              Your timezone is used to accurately generate your toast on your preferred day
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Voice & Other Preferences</h2>
                    <p className="mt-1 text-sm text-gray-500">Customize how your weekly toasts sound and other delivery options</p>
                  </div>
                  
                  <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
                    <div className="space-y-6">
                      {/* Preferred Voice */}
                      <FormField
                        control={form.control}
                        name="voiceStyle"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <FormLabel>Preferred Voice Style</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-1 gap-4 sm:grid-cols-4"
                              >
                                <FormItem className="relative">
                                  <FormControl>
                                    <RadioGroupItem
                                      value="motivational"
                                      className="sr-only peer"
                                      id="voice-motivational"
                                    />
                                  </FormControl>
                                  <FormLabel
                                    htmlFor="voice-motivational"
                                    className="flex p-3 bg-white border border-gray-300 rounded-lg cursor-pointer focus:outline-none hover:bg-gray-50 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary-500 peer-data-[state=checked]:border-transparent"
                                  >
                                    <div className="w-10 h-10 mr-3 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                                      </svg>
                                    </div>
                                    <div>
                                      <span className="block text-sm font-medium text-gray-900">Motivational Coach</span>
                                      <span className="block text-sm text-gray-500">Energetic, encouraging tone</span>
                                    </div>
                                  </FormLabel>
                                </FormItem>
                                
                                <FormItem className="relative">
                                  <FormControl>
                                    <RadioGroupItem
                                      value="friendly"
                                      className="sr-only peer"
                                      id="voice-friendly"
                                    />
                                  </FormControl>
                                  <FormLabel
                                    htmlFor="voice-friendly"
                                    className="flex p-3 bg-white border border-gray-300 rounded-lg cursor-pointer focus:outline-none hover:bg-gray-50 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary-500 peer-data-[state=checked]:border-transparent"
                                  >
                                    <div className="w-10 h-10 mr-3 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                      </svg>
                                    </div>
                                    <div>
                                      <span className="block text-sm font-medium text-gray-900">Friendly Conversationalist</span>
                                      <span className="block text-sm text-gray-500">Warm, casual tone</span>
                                    </div>
                                  </FormLabel>
                                </FormItem>
                                
                                <FormItem className="relative">
                                  <FormControl>
                                    <RadioGroupItem
                                      value="poetic"
                                      className="sr-only peer"
                                      id="voice-poetic"
                                    />
                                  </FormControl>
                                  <FormLabel
                                    htmlFor="voice-poetic"
                                    className="flex p-3 bg-white border border-gray-300 rounded-lg cursor-pointer focus:outline-none hover:bg-gray-50 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary-500 peer-data-[state=checked]:border-transparent"
                                  >
                                    <div className="w-10 h-10 mr-3 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                                        <line x1="16" y1="8" x2="2" y2="22"></line>
                                        <line x1="17.5" y1="15" x2="9" y2="15"></line>
                                      </svg>
                                    </div>
                                    <div>
                                      <span className="block text-sm font-medium text-gray-900">Poetic Narrator</span>
                                      <span className="block text-sm text-gray-500">Thoughtful, eloquent tone</span>
                                    </div>
                                  </FormLabel>
                                </FormItem>
                                
                                <FormItem className="relative">
                                  <FormControl>
                                    <RadioGroupItem
                                      value="david"
                                      className="sr-only peer"
                                      id="voice-david"
                                    />
                                  </FormControl>
                                  <FormLabel
                                    htmlFor="voice-david"
                                    className="flex p-3 bg-white border border-gray-300 rounded-lg cursor-pointer focus:outline-none hover:bg-gray-50 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary-500 peer-data-[state=checked]:border-transparent"
                                  >
                                    <div className="w-10 h-10 mr-3 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 18.5c4.142 0 7.5-3.134 7.5-7s-3.358-7-7.5-7c-4.142 0-7.5 3.134-7.5 7s3.358 7 7.5 7z"></path>
                                        <path d="M8.5 12h7"></path>
                                        <path d="M12 15.5v-7"></path>
                                      </svg>
                                    </div>
                                    <div>
                                      <span className="block text-sm font-medium text-gray-900">David</span>
                                      <span className="block text-sm text-gray-500">Professional, articulate tone</span>
                                    </div>
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="px-0 text-primary-600"
                              onClick={playVoiceSample}
                            >
                              Preview Voice Samples
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                              </svg>
                            </Button>
                          </FormItem>
                        )}
                      />
                      
                      {/* Weekly Toast Day Preference */}
                      <FormField
                        control={form.control}
                        name="weeklyToastDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weekly Toast Day</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value.toString()}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a day" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Sunday</SelectItem>
                                  <SelectItem value="1">Monday</SelectItem>
                                  <SelectItem value="2">Tuesday</SelectItem>
                                  <SelectItem value="3">Wednesday</SelectItem>
                                  <SelectItem value="4">Thursday</SelectItem>
                                  <SelectItem value="5">Friday</SelectItem>
                                  <SelectItem value="6">Saturday</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              Choose which day of the week you'd like to receive your weekly toast
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Timezone Selection */}
                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select your timezone" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {(() => {
                                    // Get timezones available in the browser
                                    try {
                                      return Intl.supportedValuesOf('timeZone').map(tz => (
                                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                      ));
                                    } catch (e) {
                                      // Fallback for browsers that don't support Intl.supportedValuesOf
                                      return [
                                        "UTC", "America/New_York", "America/Chicago", 
                                        "America/Denver", "America/Los_Angeles", "Europe/London",
                                        "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"
                                      ].map(tz => (
                                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                      ));
                                    }
                                  })()}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              Your timezone is used to calculate when your weekly toast is generated
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Toast Tone Preference */}
                      <FormField
                        control={form.control}
                        name="toastTone"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>Toast Tone Preference</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="space-y-2"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="auto" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Auto-detect from my notes
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="uplifting" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Always uplifting
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="reflective" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Thoughtful and reflective
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="humorous" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Light-hearted and humorous
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Notification Preferences */}
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
                    <p className="mt-1 text-sm text-gray-500">Manage how and when you receive notifications</p>
                  </div>
                  
                  <div className="px-4 py-5 sm:p-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="dailyReminder"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-medium">
                                Daily reflection reminder
                              </FormLabel>
                              <FormDescription>
                                Receive a notification if you haven't added your daily reflection
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="toastNotification"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-medium">
                                Weekly toast notification
                              </FormLabel>
                              <FormDescription>
                                Receive a notification when your weekly toast is ready
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-medium">
                                Email notifications
                              </FormLabel>
                              <FormDescription>
                                Receive notifications via email in addition to in-app alerts
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div className="px-4 py-5 sm:px-6 border-t border-gray-200 flex justify-end">
                    <Button 
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Settings"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
