import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, ensureAuthenticated } from "./auth";
import { registerSocialRoutes } from "./routes/social";
import gamificationRoutes from "./routes/gamification";
import userSettingsRoutes from "./routes/user-settings";
import transcriptionRoutes from "./routes/transcription";
import googleAuth from './auth-google';
import { 
  sendVerification, 
  verifyEmail, 
  forgotPassword, 
  resetPassword, 
  resendVerification 
} from "./routes/auth-email";
import { completeOnboarding } from "./routes/onboarding";
// WebSocket temporarily disabled for debugging
import WebSocket from 'ws';
import { DateTime } from 'luxon';
import { 
  insertNoteSchema, 
  insertVoicePreferenceSchema,
  insertToastSchema,
  insertFeedbackSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "@shared/schema";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { generateSpeech, getVoiceId, checkElevenLabsCredits } from "./services/elevenlabs";
import { getAvailableVoices, getTTSVoiceForId, getElevenLabsVoiceId } from "./services/voice-catalogue";
import { generateWeeklyToast, TOAST_SYSTEM_PROMPT } from "./services/toast-generator";
import { CONFIG } from "./config";
import { runImmediateToastGeneration } from './services/scheduled-jobs';
import OpenAI from "openai";
import { generateToken } from "./services/jwt";
import { generateReflectionReview } from "./services/reflection-review";
import adminRoutes from './routes/admin';

/**
 * Extract main themes from note contents
 * @param noteContents Array of note contents
 * @returns Array of identified themes
 */
function getThemesFromNotes(noteContents: string[]): string[] {
  // This is a simplified version - in a real app, we might use NLP
  // to extract themes from the notes
  const commonThemes: {[key: string]: number} = {};

  // Keywords to look for in notes
  const themeKeywords = {
    'achievement': ['accomplish', 'achieve', 'complete', 'finish', 'win', 'success'],
    'gratitude': ['grateful', 'thankful', 'appreciate', 'blessing', 'thanks'],
    'learning': ['learn', 'discover', 'understand', 'insight', 'knowledge'],
    'challenge': ['challenge', 'difficult', 'hard', 'overcome', 'struggle'],
    'creativity': ['create', 'design', 'idea', 'innovation', 'creative'],
    'health': ['exercise', 'health', 'workout', 'run', 'wellbeing', 'meditation'],
    'relationship': ['friend', 'family', 'connect', 'relationship', 'conversation'],
    'career': ['work', 'job', 'career', 'professional', 'project'],
    'joy': ['happy', 'joy', 'enjoy', 'fun', 'laugh', 'smile', 'delight']
  };

  // Check each note for themes
  for (const note of noteContents) {
    const lowerNote = note.toLowerCase();

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => lowerNote.includes(keyword))) {
        commonThemes[theme] = (commonThemes[theme] || 0) + 1;
      }
    }
  }

  // Get top 3 themes
  return Object.entries(commonThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);
}

/**
 * Generate personalized toast content based on notes and themes
 * @param noteCount Number of notes
 * @param themes Array of themes identified in the notes
 * @returns Generated toast content
 */
function generateToastContent(noteCount: number, themes: string[]): string {
  // Intro templates
  const intros = [
    "Here's to your week of reflection and growth!",
    "Raising a glass to your week of insights and experiences!",
    "Cheers to another week of your journey!",
    "Let's celebrate your week of mindful reflection!",
    "Another week, another opportunity to celebrate you!"
  ];

  // Acknowledgment templates
  const acknowledgments = [
    `You've captured ${noteCount} moments this week.`,
    `You've recorded ${noteCount} reflections this past week.`,
    `With ${noteCount} thoughtful notes this week, you're building a wonderful practice.`,
    `Your ${noteCount} entries this week show your commitment to reflection.`
  ];

  // Theme-specific templates
  const themeMessages: {[key: string]: string[]} = {
    'achievement': [
      "Your accomplishments stand as a testament to your dedication and hard work.",
      "You've achieved important milestones that deserve recognition.",
      "Your success this week is worth celebrating and building upon."
    ],
    'gratitude': [
      "Your practice of gratitude is nurturing a positive outlook on life.",
      "By acknowledging what you're thankful for, you're cultivating more joy.",
      "Your appreciation for the good things reminds us all to count our blessings."
    ],
    'learning': [
      "Your curiosity and dedication to learning is inspiring.",
      "The knowledge you've gained will serve you well on your journey.",
      "Your commitment to growth and understanding shows in your reflections."
    ],
    'challenge': [
      "You've faced obstacles with courage and resilience.",
      "The challenges you've navigated have made you stronger.",
      "Your perseverance through difficult times reveals your inner strength."
    ],
    'creativity': [
      "Your creative spark has produced wonderful insights and ideas.",
      "The innovative thinking in your notes shows your unique perspective.",
      "Your creative approach to life's situations is truly refreshing."
    ],
    'health': [
      "Your dedication to well-being is a foundation for everything else.",
      "The steps you're taking for your health will reward you many times over.",
      "Your commitment to self-care sets an excellent example."
    ],
    'relationship': [
      "The connections you nurture enrich both your life and others'.",
      "Your investment in relationships shows what you truly value.",
      "The bonds you're strengthening create a supportive community around you."
    ],
    'career': [
      "Your professional dedication is moving you toward your goals.",
      "The work you've done this week brings you closer to your aspirations.",
      "Your career journey shows thoughtful navigation and purpose."
    ],
    'joy': [
      "The happiness you've found and created brightens your days.",
      "Your moments of joy are well-earned and worth savoring.",
      "The delight you've experienced reminds us all to find pleasure in life."
    ]
  };

  // Closing templates
  const closings = [
    "Here's to another week of growth and discovery ahead!",
    "Looking forward to seeing where your journey takes you next week!",
    "May the coming days bring even more meaningful moments to celebrate!",
    "Carry this positive momentum forward into the days ahead!",
    "Wishing you a week ahead filled with insights and growth!"
  ];

  // Randomly select templates
  const intro = intros[Math.floor(Math.random() * intros.length)];
  const acknowledgment = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  // Build the content
  let content = `${intro} ${acknowledgment}\n\n`;

  // Add theme-specific content
  if (themes.length > 0) {
    content += "This week, I noticed these themes in your reflections:\n\n";

    themes.forEach(theme => {
      if (themeMessages[theme]) {
        const messages = themeMessages[theme];
        const message = messages[Math.floor(Math.random() * messages.length)];
        content += `${theme.charAt(0).toUpperCase() + theme.slice(1)}: ${message}\n\n`;
      }
    });
  }

  // Add closing
  content += closing;

  return content;
}

// This tells TypeScript that req.user is defined after ensureAuthenticated
// We already have a User interface defined in auth.ts, so no need to redefine it here

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  setupAuth(app);

  // Email verification and password reset routes
  app.post("/api/auth/send-verification", sendVerification);
  app.post("/api/auth/verify-email", verifyEmail);
  app.post("/api/auth/forgot-password", forgotPassword);
  app.post("/api/auth/reset-password", resetPassword);
  app.post("/api/auth/resend-verification", resendVerification);

  // Onboarding route
  app.post("/api/user/complete-onboarding", ensureAuthenticated, completeOnboarding);

  // Google OAuth authentication routes
  // Endpoint to check if Google auth is configured
  app.get('/api/auth/google/status', (req, res) => {
    const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    res.json({ configured: isConfigured });
  });

  // Check if Google OAuth is configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Standard API endpoint for Google Auth
    app.get('/api/auth/google', 
      googleAuth.authenticate('google', { 
        scope: ['email', 'profile'],
        prompt: 'select_account'
      })
    );

    // Handle callback at API path
    app.get('/api/auth/google/callback', 
      googleAuth.authenticate('google', { 
        failureRedirect: '/auth?error=google_auth_failed' 
      }),
      (req, res) => {
        // Successful authentication, redirect to home page
        res.redirect('/');
      }
    );

    // Also handle the callback at the path configured in Google Cloud Console
    app.get('/auth/google/callback', 
      googleAuth.authenticate('google', { 
        failureRedirect: '/auth?error=google_auth_failed' 
      }),
      (req, res) => {
        // Successful authentication, redirect to home page
        res.redirect('/');
      }
    );
  }

  // Social features routes
  registerSocialRoutes(app);

  // Gamification and analytics routes
  app.use('/api/gamification', gamificationRoutes);

  // User settings routes
  app.use(userSettingsRoutes);

  // Audio transcription routes
  app.use('/api/transcribe', transcriptionRoutes);

  // Notes endpoints
  app.post("/api/notes", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Creating note for user:", req.user?.id);
      console.log("Authentication state:", !!req.user, "Session ID:", req.sessionID?.substring(0, 8));

      const userId = req.user!.id;
      const validatedData = insertNoteSchema.parse({
        ...req.body,
        userId,
        // TODO (BundledAway): activate bundleTag feature when UI is ready
        bundleTag: req.body.bundleTag || null
      });

      // Check if in testing mode - skip database writes
      const isTestingMode = (req.session as any).testingMode === true || CONFIG.TESTING_MODE;

      let note;
      let userBadge = null;

      if (isTestingMode) {
        // Create a mock note with a consistent ID for testing
        note = {
          id: Math.floor(Math.random() * 10000),
          userId,
          content: validatedData.content,
          audioUrl: null,
          bundleTag: validatedData.bundleTag,
          createdAt: new Date()
        };

        // Store the note in the session's testingNotes array 
        if (!(req.session as any).testingNotes) {
          (req.session as any).testingNotes = [];
        }
        (req.session as any).testingNotes.push(note);

        console.log(`[Testing Mode] Note ${note.id} created for user ${userId}`);

        // Save session
        req.session.save((err) => {
          if (err) {
            console.error("Error saving testing note to session:", err);
          } else {
            const notes = (req.session as any).testingNotes || [];
            console.log(`[Testing Mode] Stored note in session, current count: ${notes.length}`);
            console.log(`[Testing Mode] Note IDs in session: ${notes.map((n: any) => n.id).join(', ')}`);
          }
        });

        // Log the user data for debugging
        console.log("Testing user ID:", req.user?.id);

        // Create a mock first note badge for testing
        userBadge = {
          id: Math.floor(Math.random() * 10000),
          userId,
          badgeId: 1,
          seen: false,
          createdAt: new Date(),
          badge: {
            id: 1,
            name: "First Note",
            description: "You created your first note!",
            imageUrl: "/badges/first-note.svg",
            category: "milestone",
            requirement: "first_note",
            createdAt: new Date()
          }
        };
      } else {
        console.log(`Creating note for user ${userId}`);
        note = await storage.createNote(validatedData);
        console.log(`Note ${note.id} created for user ${note.userId}`);

        // Check if this is the user's first note and award badge if it is
        try {
          const notesCount = await storage.getUserNotesCount(userId);
          console.log(`User ${userId} has ${notesCount} notes`);

          if (notesCount === 1) {
            console.log("This is the user's first note! Checking for first note badge...");
            const badge = await storage.getBadgeByRequirement('first_note');

            if (badge) {
              console.log(`Found first note badge: ${badge.name}`);
              userBadge = await storage.awardBadge(userId, badge.id);
              console.log(`Badge awarded: ${userBadge.id}`);

              // Notify connected WebSocket clients about the badge
              const wss = req.app.locals.wss;
              if (wss) {
                const clients = [...wss.clients].filter(
                  client => client.userId === userId && client.readyState === WebSocket.OPEN
                );

                if (clients.length > 0) {
                  const badgeEvent = {
                    type: 'badge-earned',
                    data: {
                      badgeId: badge.id,
                      badgeName: badge.name,
                      badgeIcon: badge.icon,
                      badgeDescription: badge.description
                    }
                  };

                  clients.forEach(client => {
                    client.send(JSON.stringify(badgeEvent));
                  });

                  console.log(`WebSocket notification sent to ${clients.length} clients`);
                }
              }
            } else {
              console.log("First note badge not found in the database");
            }
          }
        } catch (badgeError) {
          // Just log the error but don't fail the note creation
          console.error("Error awarding badge:", badgeError);
        }
      }

      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create note" });
      }
    }
  });

  app.get("/api/notes", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Check if in testing mode
      const isTestingMode = (req.session as any).testingMode === true || CONFIG.TESTING_MODE;

      if (isTestingMode && (req.session as any).testingNotes) {
        // Return notes from session for testing mode
        const testingNotes = (req.session as any).testingNotes || [];
        console.log(`[Testing Mode] Returning ${testingNotes.length} notes from session`);
        return res.json(testingNotes);
      }

      // Normal database access
      const notes = await storage.getNotesByUserId(userId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.get("/api/notes/today", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if in testing mode
      const isTestingMode = (req.session as any).testingMode === true || CONFIG.TESTING_MODE;

      if (isTestingMode && (req.session as any).testingNotes) {
        // Filter today's notes from session for testing mode
        const testingNotes = (req.session as any).testingNotes || [];
        const todayNotes = testingNotes.filter((note: any) => {
          const noteDate = new Date(note.createdAt);
          noteDate.setHours(0, 0, 0, 0);
          return noteDate.getTime() === today.getTime();
        });

        console.log(`[Testing Mode] Returning ${todayNotes.length} notes for today from session`);
        return res.json(todayNotes);
      }

      // Normal database access
      const notes = await storage.getNotesByUserIdAndDate(userId, today);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching today's notes:", error);
      res.status(500).json({ message: "Failed to fetch today's note" });
    }
  });

  app.put("/api/notes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const userId = req.user!.id;

      const note = await storage.getNoteById(noteId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      if (note.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this note" });
      }

      const updatedNote = await storage.updateNote(noteId, req.body);
      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const userId = req.user!.id;

      const note = await storage.getNoteById(noteId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      if (note.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this note" });
      }

      await storage.deleteNote(noteId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // Generate reflection review
  app.post("/api/notes/:id/review", ensureAuthenticated, async (req, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Verify the note belongs to the user
      const note = await storage.getNoteById(noteId);
      if (!note || note.userId !== userId) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Check if we already have a cached review and audio URL
      const existingReview = await storage.getReflectionReview(noteId);
      if (existingReview) {
        return res.json({ 
          review: existingReview.reviewText,
          audioUrl: existingReview.audioUrl 
        });
      }

      // Generate the review
      const review = await generateReflectionReview(note.content || "");

      // Store the review in the database for caching
      await storage.createReflectionReview({
        noteId,
        reviewText: review,
        audioUrl: null // Will be populated when TTS is generated
      });

      // Return the review
      res.json({ review });
    } catch (error) {
      console.error("Error generating reflection review:", error);
      res.status(500).json({ message: "Failed to generate reflection review" });
    }
  });

  // Voice preferences endpoints
  app.get("/api/preferences", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const preferences = await storage.getVoicePreferenceByUserId(userId);

      if (!preferences) {
        // Create default preferences if none exist
        const defaultPreferences = await storage.createVoicePreference({
          userId,
          voiceStyle: "motivational",
          toastDay: "Sunday",
          toastTone: "auto",
          dailyReminder: true,
          toastNotification: true,
          emailNotifications: false,
          dailyReminderHour: 9,
        });
        return res.json(defaultPreferences);
      }

      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.put("/api/preferences", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertVoicePreferenceSchema.parse({
        ...req.body,
        userId
      });

      const preferences = await storage.getVoicePreferenceByUserId(userId);

      // Check if voice style is changing
      const voiceStyleChanged = preferences && 
        validatedData.voiceStyle && 
        preferences.voiceStyle !== validatedData.voiceStyle;

      if (!preferences) {
        const newPreferences = await storage.createVoicePreference(validatedData);
        return res.json(newPreferences);
      }

      const updatedPreferences = await storage.updateVoicePreference(preferences.id, validatedData);

      // If voice style changed, clear all cached audio for this user's reflection reviews
      if (voiceStyleChanged) {
        console.log(`[Voice Change] Clearing cached audio for user ${userId} due to voice style change from ${preferences.voiceStyle} to ${validatedData.voiceStyle}`);
        await storage.clearReflectionReviewAudioForUser(userId);
      }

      res.json(updatedPreferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update preferences" });
      }
    }
  });

  // Toasts endpoints
  app.get("/api/toasts", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const toasts = await storage.getToastsByUserId(userId);
      res.json(toasts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch toasts" });
    }
  });

  app.get("/api/toasts/latest", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const toasts = await storage.getToastsByUserId(userId);

      if (toasts.length === 0) {
        return res.status(404).json({ message: "No toasts found" });
      }

      // Sort by creation date and get the latest
      const latestToast = toasts.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })[0];

      res.json(latestToast);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest toast" });
    }
  });

  // Modern API route using the new toast-generator service
  app.post("/api/toasts/generate", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const voice = req.body.voice;
      const forceGenerate = req.body.forceGenerate || false; // For testing purposes

      // Get user for timezone and weekly toast day preferences
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[Toast Generator] Generating toast for user ${userId}, voice: ${voice || 'default'}, using standardized format with timezone: ${user.timezone || 'UTC'}, weeklyToastDay: ${user.weeklyToastDay || 0}`);

      // Update user voice preference if provided, but skip for test users
      const isTestUser = userId === CONFIG.TEST_USER.id;
      if (voice && !isTestUser) {
        const existingPref = await storage.getVoicePreferenceByUserId(userId);
        if (existingPref) {
          await storage.updateVoicePreference(existingPref.id, {
            voiceStyle: voice
          });
        } else {
          await storage.createVoicePreference({
            userId,
            voiceStyle: voice
          });
        }
      }

      // For test users, proceed without voice preference database operations
      if (isTestUser) {
        console.log("Testing mode: Skipping voice preference database operations");
      }

      try {
        // Generate the weekly toast using the standardized format with user's preferences
        // Pass the full user object to ensure timezone and weekly toast day preferences are used
        const result = await generateWeeklyToast(userId, user.name, forceGenerate);

        console.log(`[Toast Generator] Result:`, {
          content: result.content ? `${result.content.substring(0, 30)}...` : 'No content', 
          audioUrl: result.audioUrl || 'No audio URL'
        });

        // Log analytics for toast generation, but skip for test users
        if (storage.logUserActivity && userId !== CONFIG.TEST_USER.id) {
          try {
            await storage.logUserActivity({
              userId,
              activityType: 'toast-generate',
              metadata: { 
                automated: false,
                source: 'manual-trigger',
                hasAudio: !!result.audioUrl
              } as Record<string, any>
            });
          } catch (activityError) {
            // Log but don't fail the request if activity logging fails
            console.warn('[Toast Generator] Failed to log user activity:', activityError);
          }
        } else if (userId === CONFIG.TEST_USER.id) {
          console.log('[Toast Generator] Test user - skipping activity logging');
        }

        res.status(201).json(result);
      } catch (err: any) {
        console.error('[Toast gen]', err);
        return res.status(400).json({ error: err.message });
      }
    } catch (error: any) {
      console.error('Error generating toast:', error);

      // Handle specific errors
      if (error?.message?.includes('No notes found')) {
        return res.status(400).json({ 
          message: "You don't have any notes from the last week to generate a toast" 
        });
      }

      res.status(500).json({ 
        message: "Failed to generate toast", 
        error: error?.message || "Unknown error"
      });
    }
  });

  // Endpoint to regenerate a toast with updated voice preference
  app.post("/api/toasts/regenerate", ensureAuthenticated, async (req, res) => {
    try {
      // Get user info and preferences
      const userId = req.user!.id;
      const voice = req.body.voice;

      // Get user for timezone and weekly toast day preferences
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[Toast Generator] Regenerating toast for user ${userId}, voice: ${voice || 'default'}, using standardized format with timezone: ${user.timezone || 'UTC'}, weeklyToastDay: ${user.weeklyToastDay || 0}`);

      // Always update user voice preference if provided
      if (voice) {
        const existingPref = await storage.getVoicePreferenceByUserId(userId);
        if (existingPref) {
          await storage.updateVoicePreference(existingPref.id, {
            voiceStyle: voice
          });
          console.log(`[Toast Generator] Updated voice preference to: ${voice}`);
        } else {
          await storage.createVoicePreference({
            userId,
            voiceStyle: voice
          });
          console.log(`[Toast Generator] Created new voice preference: ${voice}`);
        }
      } else {
        console.log(`[Toast Generator] No voice preference provided, using user's saved preference`);
      }

      // Get date range for the past week
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      // Get user notes for the past week
      const userNotes = await storage.getNotesByUserIdAndDateRange(userId, startDate, endDate);

      if (userNotes.length === 0) {
        return res.status(400).json({ error: "No notes found for this week. Add some reflections first!" });
      }

      // Extract note contents and IDs
      const noteContents = userNotes.map(note => note.content || '').filter(Boolean);
      const noteIds = userNotes.map(note => note.id);

      // Format reflections
      const formattedReflections = noteContents.join('\n\n');

      console.log(`[Toast Generator] Using standard toast format`);

      try {
        // Use the standardized toast generator function with updated prompt format
        const toast = await generateWeeklyToast(userId, req.user?.name || '');

        // The toast content and creation is now handled within generateWeeklyToast

        // Now generate audio with the selected voice using voice catalogue
        const ttsVoice = getTTSVoiceForId(voice || 'rachel');

        // Generate speech with OpenAI TTS using the voice catalogue
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const mp3Response = await openai.audio.speech.create({
          model: 'tts-1',
          voice: ttsVoice as any,
          input: toast.content,
        });

        const buffer = Buffer.from(await mp3Response.arrayBuffer());
        const filename = `toast-${Date.now()}.mp3`;

        // Upload to Supabase Storage
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio')
          .upload(filename, buffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('Error uploading weekly toast audio:', uploadError);
          throw new Error('Failed to upload audio file');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('audio')
          .getPublicUrl(uploadData.path);

        // Update toast with audio URL
        const updatedToast = await storage.updateToast(toast.id, { audioUrl: publicUrl });

        // Log analytics for toast regeneration
        if (storage.logUserActivity) {
          await storage.logUserActivity({
            userId,
            activityType: 'toast-regenerate',
            metadata: { 
              voiceChanged: !!voice,
              source: 'manual-trigger',
              hasAudio: !!publicUrl && !publicUrl.startsWith('Error:')
            } as Record<string, any>
          });
        }

        console.log(`[Toast Generator] Regenerated toast:`, {
          content: updatedToast.content ? `${updatedToast.content.substring(0, 30)}...` : 'No content', 
          audioUrl: updatedToast.audioUrl || 'No audio URL'
        });

        res.status(200).json(updatedToast);
      } catch (err: any) {
        console.error('[Toast regeneration] OpenAI or database error:', err);
        return res.status(400).json({ error: err.message });
      }
    } catch (error: any) {
      console.error('Error regenerating toast:', error);

      // Handle specific errors
      if (error?.message?.includes('No notes found')) {
        return res.status(400).json({ 
          message: "You don't have any notes from the last week to regenerate a toast" 
        });
      }

      res.status(500).json({ 
        message: "Failed to regenerate toast", 
        error: error?.message || "Unknown error"
      });
    }
  });

  // Legacy route kept for backward compatibility
  app.post("/api/toasts", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get user voice preferences
      const preferences = await storage.getVoicePreferenceByUserId(userId);
      const voiceStyle = preferences?.voiceStyle || 'motivational';

      // Get recentnotes to generate the toast
      const recentNotes = await storage.getRecentNotesByUserId(userId, 7);

      if (recentNotes.length === 0) {
        return res.status(400).json({ message: "You don't have any notes to generate a toast" });
      }

      const noteIds = recentNotes.map(note => note.id);

      // Extract significant themes and highlights from notes
      const noteContents = recentNotes.map(note => note.content || "").filter(Boolean);

      // Generate a more personalized toast content
      const themes =getThemesFromNotes(noteContents);
      const toastContent = generateToastContent(noteContents.length, themes);

      // Get theappropriate voice ID based on user preference
      const voiceId = getVoiceId(voiceStyle);

      // Generate speech audio using ElevenLabs API
      let audioUrl: string | null = null;
      try {
        const ttsResult = await generateSpeech(toastContent, voiceId, userId);

        // Handle different response types
        if (typeof ttsResult === 'string') {
          // Success case - we got an audio URL
          audioUrl = ttsResult;
          console.log(`Generated audio file: ${audioUrl}`);
        } 
        else if (ttsResult && typeof ttsResult === 'object' && 'error' in ttsResult) {
          // Error case with specific message
          console.warn(`Audio generation error: ${ttsResult.error}`);
          audioUrl = `Error: ${ttsResult.error}`;
        }
        else {
          // Null or unexpected response
          console.log('Failed to generate audio - null response');
          audioUrl = 'Error: Audio generation failed';
        }
      } catch (error) {
        console.error('Error generating audio:', error);
        audioUrl = 'Error: Audio generation failed';
      }

      // Create a unique share URL
      const shareId = createId();
      const shareUrl = `/shared/${shareId}`;

      const toast = await storage.createToast({
        userId,
        content: toastContent,
        audioUrl,
        type: 'weekly',
        intervalStart: new Date(),
        intervalEnd: new Date()
      });

      res.status(201).json(toast);
    } catch (error) {
      res.status(500).json({ message: "Failed to create toast" });
    }
  });

  app.put("/api/toasts/:id/share", ensureAuthenticated, async (req, res) => {
    try {
      const toastId = parseInt(req.params.id);
      const userId = req.user!.id;

      const toast = await storage.getToastById(toastId);
      if (!toast) {
        return res.status(404).json({ message: "Toast not found" });
      }

      if (toast.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to share this toast" });
      }

      const updatedToast = await storage.updateToast(toastId, { audioUrl: toast.audioUrl });
      res.json(updatedToast);
    } catch (error) {
      res.status(500).json({ message: "Failed to share toast" });
    }
  });

  // Regenerate audio for an existing toast with a different voice
  app.post("/api/toasts/:id/regenerate-audio", ensureAuthenticated, async (req, res) => {
    try {
      const toastId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { voiceStyle } = req.body;

      // Get the toast
      const toast = await storage.getToastById(toastId);
      if (!toast) {
        return res.status(404).json({ message: "Toast not found" });
      }

      // Verify ownership
      if (toast.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to modify this toast" });
      }

      // Get the appropriate voice ID
      const voiceId = getVoiceId(voiceStyle || 'motivational');

      // Generate new audio
      let audioUrl: string | null = null;
      try {
        const ttsResult = await generateSpeech(toast.content, voiceId, userId);

        // Handle different response types
        if (typeof ttsResult === 'string') {
          // Success case - we got an audio URL
          audioUrl = ttsResult;
          console.log(`Regenerated audio file: ${audioUrl}`);
        } 
        else if (ttsResult && typeof ttsResult === 'object' && 'error' in ttsResult) {
          // Error case with specific message
          console.warn(`Audio regeneration error: ${ttsResult.error}`);
          return res.status(500).json({ 
            message: `Failed to generate audio: ${ttsResult.error}`,
            error: ttsResult.error
          });
        }
        else {
          // Null or unexpected response
          console.log('Failed to regenerate audio - null response');
          return res.status(500).json({ message: "Failed to generate audio: Unexpected error" });
        }
      } catch (error) {
        console.error('Error regenerating audio:', error);
        return res.status(500).json({ message: "Failed to generate audio: Server error" });
      }

      // Update the toast with the new audio URL
      const updatedToast = await storage.updateToast(toastId, { audioUrl });
      res.json(updatedToast);
    } catch (error) {
      res.status(500).json({ message: "Failed to regenerate audio" });
    }
  });

  // Stats for dashboard
  app.get("/api/stats", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Stats request - User:", req.user?.id, "Session:", req.sessionID?.substring(0, 8));
      const userId = req.user!.id;
      const isTestingMode = (req.session as any).testingMode === true || CONFIG.TESTING_MODE;

      // Get the count of notes for the current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Set to Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      let weeklyNotesCount = 0;
      let streak = 0;

      // If in testing mode, get notes from session instead of database
      if (isTestingMode && (req.session as any).testingNotes) {
        const testingNotes = (req.session as any).testingNotes || [];

        // Count notes in the current week
        const weeklyNotes = testingNotes.filter((note: any) => {
          const noteDate = new Date(note.createdAt);
          return noteDate >= startOfWeek && noteDate <= today;
        });

        weeklyNotesCount = weeklyNotes.length;

        // Set streak to the number of consecutive days with notes
        // For testing mode, simplify by returning count of days with notes
        const days = new Set();
        testingNotes.forEach((note: any) => {
          const noteDate = new Date(note.createdAt);
          const dayKey = `${noteDate.getFullYear()}-${noteDate.getMonth()}-${noteDate.getDate()}`;
          days.add(dayKey);
        });

        streak = days.size;

        console.log(`[Testing Mode] Stats: ${weeklyNotesCount} weekly notes, ${streak} day streak`);
      } else {
        // Normal database access
        streak = await storage.getUserStreak(userId);
        const weeklyNotes = await storage.getNotesByUserIdAndDateRange(userId, startOfWeek, today);
        weeklyNotesCount = weeklyNotes.length;
      }

      // Get user data to determine the next toast day using weeklyToastDay preference
      const user = await storage.getUser(userId);

      let nextToastDate: Date;
      if (user) {
        // Use user timezone if set, otherwise default to UTC
        const timezone = user.timezone || 'UTC';
        // Get preferred day (0 = Sunday, 6 = Saturday) or default to Sunday (0)
        const preferredDay = user.weeklyToastDay ?? 0;

        try {
          // Calculate next toast date using user's timezone
          const now = DateTime.now().setZone(timezone);
          // Convert weeklyToastDay (0-6) to Luxon format (1-7, where 7 is Sunday)
          const luxonDay = preferredDay === 0 ? 7 : preferredDay;
          // Get next occurrence of preferred day
          let nextDate = now.set({ weekday: luxonDay as 1|2|3|4|5|6|7 });

          // If today is the toast day or we've already passed it, move to next week
          if (nextDate <= now) {
            nextDate = nextDate.plus({ weeks: 1 });
          }

          nextToastDate = nextDate.toJSDate();
          console.log(`Next toast date calculated as ${nextDate.toFormat('yyyy-MM-dd')} in timezone ${timezone}`);
        } catch (error) {
          console.error('Error calculating next toast date:', error);
          // Fallback to simple calculation if DateTime fails
          const todayDayIndex = today.getDay();
          const preferredDayIndex = preferredDay;

          nextToastDate = new Date(today);
          if (todayDayIndex < preferredDayIndex) {
            nextToastDate.setDate(today.getDate() + (preferredDayIndex - todayDayIndex));
          } else if (todayDayIndex > preferredDayIndex) {
            nextToastDate.setDate(today.getDate() + (7 - todayDayIndex + preferredDayIndex));
          } else {
            // If today is the toast day, set to next week
            nextToastDate.setDate(today.getDate() + 7);
          }
        }
      } else {
        // Default to Sunday if no user found
        const daysUntilSunday = (7 - today.getDay()) % 7;
        nextToastDate = new Date(today);
        nextToastDate.setDate(today.getDate() + daysUntilSunday);
      }

      // In testing mode, always set the next toast date to tomorrow for easier testing
      if (isTestingMode) {
        nextToastDate = new Date(today);
        nextToastDate.setDate(today.getDate() + 1);
      }

      res.json({
        streak,
        weeklyNotesCount,
        totalNotesNeeded: 7,
        nextToastDate: nextToastDate.toISOString()
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // API endpoint to get application config status (for testing mode)
  app.get("/api/config/status", (req, res) => {
    // Check if user is in testing mode from session
    const isTestingSession = req.session?.testingMode === true;

    res.json({
      testingModeEnabled: CONFIG.ENABLE_TESTING_MODE,
      testingMode: isTestingSession || CONFIG.TESTING_MODE,
      message: (isTestingSession || CONFIG.TESTING_MODE)
        ? "Testing mode is enabled. Message generation restriction is bypassed." 
        : "Production mode is active. Normal message generation restrictions apply."
    });
  });

  // API endpoint to get available voices
  app.get("/api/voices", (req, res) => {
    try {
      const voices = getAvailableVoices();
      res.json(voices);
    } catch (error) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ message: "Failed to fetch available voices" });
    }
  });

  // Special route for testing mode
  app.post("/api/auth/testing-mode", (req, res) => {
    if (!CONFIG.ENABLE_TESTING_MODE) {
      return res.status(403).json({ message: "Testing mode is disabled" });
    }

    // Set testing mode flag in session
    req.session.testingMode = true;

    // Save session
    req.session.save((err) => {
      if (err) {
        console.error("Error saving testing mode session:", err);
      }

      // Return success to client
      console.log("Testing mode enabled for session:", req.sessionID);
      res.status(200).json({
        success: true,
        message: "Testing mode enabled"
      });
    });
  });

  // API endpoint to check ElevenLabs credit status
  app.get("/api/tts/credits", ensureAuthenticated, async (req, res) => {
    try {
      // This endpoint is admin-only or for checking system status
      const credits = await checkElevenLabsCredits();

      if (!credits) {
        return res.status(500).json({ 
          message: "Failed to retrieve TTS credit information", 
          status: "error" 
        });
      }

      return res.json({
        ...credits,
        message: credits.status === 'low' 
          ? `TTS credits are running low: ${credits.remaining} characters remaining out of ${credits.limit}.` 
          : `TTS credits available: ${credits.remaining} characters out of ${credits.limit}.`
      });
    } catch (error) {
      console.error("Error checking TTS credits:", error);
      return res.status(500).json({ 
        message: "An error occurred while checking TTS credits", 
        status: "error" 
      });
    }
  });

  // Audio proxy endpoint to handle CORS issues
  app.get("/api/audio/proxy", ensureAuthenticated, async (req, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing audio URL' });
      }

      // Only allow Supabase URLs for security
      if (!url.includes('supabase.co/storage')) {
        return res.status(403).json({ error: 'Invalid audio URL' });
      }

      console.log('Proxying audio request for URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        console.error('Failed to fetch audio:', response.status, response.statusText);
        return res.status(response.status).json({ error: 'Failed to fetch audio file' });
      }

      const audioBuffer = await response.arrayBuffer();

      // Set CORS headers and proper content type
      res.set({
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600'
      });

      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error('Audio proxy error:', error);
      res.status(500).json({ error: 'Failed to proxy audio file' });
    }
  });

  // Text-to-speech endpoint for reflection reviews
  app.post("/api/tts/review", ensureAuthenticated, async (req, res) => {
    try {
      const { text, noteId } = req.body;
      const userId = req.user!.id;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // If noteId is provided, check for cached audio FIRST
      if (noteId) {
        const existingReview = await storage.getReflectionReview(noteId);
        if (existingReview?.audioUrl) {
          console.log(`[TTS] Using cached audio for note ${noteId}: ${existingReview.audioUrl}`);
          return res.json({ audioUrl: existingReview.audioUrl });
        }
      }

      console.log(`[TTS] No cached audio found for note ${noteId}, generating new audio`);

      // Get user's voice preference
      const preferences = await storage.getVoicePreferenceByUserId(userId);
      const voiceStyle = preferences?.voiceStyle || "motivational";

      // Generate speech
      const result = await generateSpeech(text, getVoiceId(voiceStyle), userId);

      if (!result) {
        return res.status(500).json({ message: "Failed to generate speech" });
      }

      if (typeof result === 'object' && 'error' in result) {
        return res.status(429).json({ 
          message: result.error,
          resetTime: result.resetTime 
        });
      }

      // Cache the audio URL if noteId is provided and generation was successful
      if (noteId && typeof result === 'string') {
        console.log(`[TTS] Caching audio URL for note ${noteId}: ${result}`);
        await storage.updateReflectionReviewAudio(noteId, result);
      }

      res.json({ audioUrl: result });
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });

  // Anonymous feedback endpoint
  app.post("/api/feedback", async (req, res) => {
    try {
      const validatedData = insertFeedbackSchema.parse(req.body);

      // Create feedback record without any user identification
      await storage.createFeedback(validatedData);

      res.status(201).json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating feedback:", error);
        res.status(500).json({ message: "Failed to submit feedback" });
      }
    }
  });

  // Admin route to manually trigger toast generation job (for testing)
  app.post("/api/admin/run-toast-generation", ensureAuthenticated, async (req, res) => {
    // Check if user is an admin or in development mode
    const userId = (req.user as any).id || (req.user as any).userId;
    if (!userId) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const isAdmin = userId === 1; // Simple admin check - user ID 1 is admin
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isAdmin && !isDevelopment) {
      return res.status(403).json({ message: "Unauthorized: Admin access required" });
    }

    try {
      // Run the immediate toast generation job
      const result = await runImmediateToastGeneration();
      return res.json(result);
    } catch (error: any) {
      console.error("Error triggering toast generation:", error);
      return res.status(500).json({
        message: "Failed to trigger toast generation",
        error: error?.message || "Unknown error"
      });
    }
  });

  // Run immediate daily reminder emails for testing
  app.post("/api/admin/run-daily-reminders", ensureAuthenticated, async (req, res) => {
    try {
      const { runImmediateDailyReminders } = await import('./services/scheduled-jobs');
      const result = await runImmediateDailyReminders();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Error: ${error?.message || 'Unknown error'}` 
      });
    }
  });

  // Register admin routes
  app.use('/api/admin', adminRoutes);

  const httpServer = createServer(app);

  // TEMPORARILY DISABLED: WebSocket functionality for debugging server crashes
  console.log('WebSocket functionality is temporarily disabled for debugging');

  // Dummy implementation to prevent errors
  (global as any).sendNotificationToUser = (userId: number, notification: any) => {
    console.log(`[Disabled WebSocket] Would send to user ${userId}:`, notification);
  };

  return httpServer;
}