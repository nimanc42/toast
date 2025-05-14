import { 
  users, 
  notes, 
  voicePreferences, 
  toasts,
  type User, 
  type Note, 
  type VoicePreference, 
  type Toast,
  type InsertUser, 
  type InsertNote, 
  type InsertVoicePreference, 
  type InsertToast 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Note methods
  getNoteById(id: number): Promise<Note | undefined>;
  getNotesByUserId(userId: number): Promise<Note[]>;
  getNotesByUserIdAndDate(userId: number, date: Date): Promise<Note[]>;
  getNotesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<Note[]>;
  getRecentNotesByUserId(userId: number, count: number): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number): Promise<void>;
  
  // Voice preference methods
  getVoicePreferenceByUserId(userId: number): Promise<VoicePreference | undefined>;
  createVoicePreference(preference: InsertVoicePreference): Promise<VoicePreference>;
  updateVoicePreference(id: number, preference: Partial<InsertVoicePreference>): Promise<VoicePreference>;
  
  // Toast methods
  getToastById(id: number): Promise<Toast | undefined>;
  getToastsByUserId(userId: number): Promise<Toast[]>;
  createToast(toast: InsertToast): Promise<Toast>;
  updateToast(id: number, toast: Partial<InsertToast>): Promise<Toast>;
  
  // Additional methods
  getUserStreak(userId: number): Promise<number>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private notes: Map<number, Note>;
  private voicePreferences: Map<number, VoicePreference>;
  private toasts: Map<number, Toast>;
  private userIdCounter: number;
  private noteIdCounter: number;
  private preferenceIdCounter: number;
  private toastIdCounter: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.notes = new Map();
    this.voicePreferences = new Map();
    this.toasts = new Map();
    this.userIdCounter = 1;
    this.noteIdCounter = 1;
    this.preferenceIdCounter = 1;
    this.toastIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // Note methods
  async getNoteById(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async getNotesByUserId(userId: number): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => note.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getNotesByUserIdAndDate(userId: number, date: Date): Promise<Note[]> {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    
    return Array.from(this.notes.values())
      .filter(note => {
        const noteDate = new Date(note.createdAt);
        return note.userId === userId && 
               noteDate >= date && 
               noteDate < nextDay;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getNotesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => {
        const noteDate = new Date(note.createdAt);
        return note.userId === userId && 
               noteDate >= startDate && 
               noteDate <= endDate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getRecentNotesByUserId(userId: number, count: number): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => note.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, count);
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.noteIdCounter++;
    const now = new Date();
    const note: Note = { 
      ...insertNote, 
      id, 
      createdAt: now
    };
    this.notes.set(id, note);
    return note;
  }

  async updateNote(id: number, updateData: Partial<InsertNote>): Promise<Note> {
    const note = this.notes.get(id);
    if (!note) {
      throw new Error(`Note with id ${id} not found`);
    }
    
    const updatedNote = { ...note, ...updateData };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteNote(id: number): Promise<void> {
    this.notes.delete(id);
  }

  // Voice preference methods
  async getVoicePreferenceByUserId(userId: number): Promise<VoicePreference | undefined> {
    return Array.from(this.voicePreferences.values())
      .find(pref => pref.userId === userId);
  }

  async createVoicePreference(insertPreference: InsertVoicePreference): Promise<VoicePreference> {
    const id = this.preferenceIdCounter++;
    const preference: VoicePreference = { 
      ...insertPreference, 
      id 
    };
    this.voicePreferences.set(id, preference);
    return preference;
  }

  async updateVoicePreference(id: number, updateData: Partial<InsertVoicePreference>): Promise<VoicePreference> {
    const preference = this.voicePreferences.get(id);
    if (!preference) {
      throw new Error(`Voice preference with id ${id} not found`);
    }
    
    const updatedPreference = { ...preference, ...updateData };
    this.voicePreferences.set(id, updatedPreference);
    return updatedPreference;
  }

  // Toast methods
  async getToastById(id: number): Promise<Toast | undefined> {
    return this.toasts.get(id);
  }

  async getToastsByUserId(userId: number): Promise<Toast[]> {
    return Array.from(this.toasts.values())
      .filter(toast => toast.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createToast(insertToast: InsertToast): Promise<Toast> {
    const id = this.toastIdCounter++;
    const now = new Date();
    const toast: Toast = { 
      ...insertToast, 
      id, 
      createdAt: now
    };
    this.toasts.set(id, toast);
    return toast;
  }

  async updateToast(id: number, updateData: Partial<InsertToast>): Promise<Toast> {
    const toast = this.toasts.get(id);
    if (!toast) {
      throw new Error(`Toast with id ${id} not found`);
    }
    
    const updatedToast = { ...toast, ...updateData };
    this.toasts.set(id, updatedToast);
    return updatedToast;
  }

  // Additional methods
  async getUserStreak(userId: number): Promise<number> {
    const userNotes = await this.getNotesByUserId(userId);
    if (userNotes.length === 0) {
      return 0;
    }

    // Get unique dates with notes
    const uniqueDates = new Set<string>();
    userNotes.forEach(note => {
      const dateStr = new Date(note.createdAt).toISOString().split('T')[0];
      uniqueDates.add(dateStr);
    });

    // Convert to array and sort
    const dates = Array.from(uniqueDates).sort().reverse();
    
    // Check for consecutive days
    let streak = 1;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // If no note for today, start checking from yesterday
    let currentDate = new Date();
    if (dates[0] !== today) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    for (let i = 0; i < dates.length - 1; i++) {
      const dateToCheck = currentDate.toISOString().split('T')[0];
      if (dates.includes(dateToCheck)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }
}

export const storage = new MemStorage();
