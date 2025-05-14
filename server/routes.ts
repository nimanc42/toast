import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, ensureAuthenticated } from "./auth";
import { registerSocialRoutes } from "./routes/social";
import gamificationRoutes from "./routes/gamification";
import { WebSocketServer, WebSocket } from "ws";
import { 
  insertNoteSchema, 
  insertVoicePreferenceSchema,
  insertToastSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "@shared/schema";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

// This tells TypeScript that req.user is defined after ensureAuthenticated
// We already have a User interface defined in auth.ts, so no need to redefine it here

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  setupAuth(app);
  
  // Social features routes
  registerSocialRoutes(app);
  
  // Gamification and analytics routes
  app.use('/api/gamification', gamificationRoutes);

  // Notes endpoints
  app.post("/api/notes", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Creating note, user:", req.user);
      console.log("Request body:", req.body);
      
      const userId = req.user!.id;
      const validatedData = insertNoteSchema.parse({
        ...req.body,
        userId
      });
      
      console.log("Validated data:", validatedData);
      const note = await storage.createNote(validatedData);
      console.log("Note created:", note);
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
      const notes = await storage.getNotesByUserId(userId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.get("/api/notes/today", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const notes = await storage.getNotesByUserIdAndDate(userId, today);
      res.json(notes);
    } catch (error) {
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
      
      if (!preferences) {
        const newPreferences = await storage.createVoicePreference(validatedData);
        return res.json(newPreferences);
      }
      
      const updatedPreferences = await storage.updateVoicePreference(preferences.id, validatedData);
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

  app.post("/api/toasts", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Generate toast content and audio using Eleven Labs API
      // This would be implemented with the actual API integration
      // For now, we'll create a simple placeholder toast
      const recentNotes = await storage.getRecentNotesByUserId(userId, 7);
      
      if (recentNotes.length === 0) {
        return res.status(400).json({ message: "You don't have any notes to generate a toast" });
      }
      
      const noteIds = recentNotes.map(note => note.id);
      
      // Generate toast content from notes
      // This would normally use the Eleven Labs API
      const noteContents = recentNotes.map(note => note.content).filter(Boolean);
      const toastContent = `Here's to your week of reflection and growth! You've shared ${noteContents.length} thoughts this week.`;
      
      // In a real implementation, we would generate the audio with Eleven Labs
      // and store the URL. For now, we'll just use a placeholder.
      const audioUrl = null;
      
      // Create a unique share URL
      const shareId = createId();
      const shareUrl = `/shared/${shareId}`;
      
      const toast = await storage.createToast({
        userId,
        content: toastContent,
        audioUrl,
        noteIds,
        shared: false,
        shareUrl
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
      
      const updatedToast = await storage.updateToast(toastId, { shared: true });
      res.json(updatedToast);
    } catch (error) {
      res.status(500).json({ message: "Failed to share toast" });
    }
  });

  // Stats for dashboard
  app.get("/api/stats", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get streak count (consecutive days with notes)
      const streak = await storage.getUserStreak(userId);
      
      // Get the count of notes for the current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Set to Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const weeklyNotes = await storage.getNotesByUserIdAndDateRange(userId, startOfWeek, today);
      
      // Get user preferences to determine the next toast day
      const preferences = await storage.getVoicePreferenceByUserId(userId);
      
      let nextToastDate: Date;
      if (preferences) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDayIndex = today.getDay();
        const toastDayIndex = days.indexOf(preferences.toastDay);
        
        nextToastDate = new Date(today);
        if (todayDayIndex < toastDayIndex) {
          nextToastDate.setDate(today.getDate() + (toastDayIndex - todayDayIndex));
        } else if (todayDayIndex > toastDayIndex) {
          nextToastDate.setDate(today.getDate() + (7 - todayDayIndex + toastDayIndex));
        } else {
          // If today is the toast day, set to next week
          nextToastDate.setDate(today.getDate() + 7);
        }
      } else {
        // Default to Sunday if no preferences
        const daysUntilSunday = (7 - today.getDay()) % 7;
        nextToastDate = new Date(today);
        nextToastDate.setDate(today.getDate() + daysUntilSunday);
      }
      
      res.json({
        streak,
        weeklyNotesCount: weeklyNotes.length,
        totalNotesNeeded: 7,
        nextToastDate: nextToastDate.toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Store connected clients by user ID
  const connectedClients = new Map<number, Set<WebSocket>>();
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    let userId: number | null = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
        
        // Handle authentication message
        if (data.type === 'auth' && data.token) {
          // In a real implementation, verify the token and get user ID
          // For now, we'll trust the user ID sent in the message
          userId = data.userId;
          
          if (userId) {
            // Add this connection to the user's set of connections
            if (!connectedClients.has(userId)) {
              connectedClients.set(userId, new Set());
            }
            connectedClients.get(userId)?.add(ws);
            
            // Acknowledge successful authentication
            ws.send(JSON.stringify({
              type: 'auth_success'
            }));
            
            console.log(`User ${userId} authenticated via WebSocket`);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Remove this connection from the user's set of connections
      if (userId && connectedClients.has(userId)) {
        connectedClients.get(userId)?.delete(ws);
        
        // If no more connections, remove the user from the map
        if (connectedClients.get(userId)?.size === 0) {
          connectedClients.delete(userId);
        }
      }
    });
  });
  
  // Export function to send notifications to users
  (global as any).sendNotificationToUser = (userId: number, notification: any) => {
    if (connectedClients.has(userId)) {
      const userConnections = connectedClients.get(userId);
      
      if (userConnections) {
        userConnections.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(notification));
          }
        });
      }
    }
  };
  
  return httpServer;
}
