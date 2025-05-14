import { 
  type User, 
  type Note, 
  type VoicePreference, 
  type Toast,
  type Token,
  type InsertUser, 
  type InsertNote, 
  type InsertVoicePreference, 
  type InsertToast,
  type InsertToken
} from "@shared/schema";
import session from "express-session";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>; 
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  verifyUserEmail(id: number): Promise<User>;
  
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
  
  // Token methods
  createToken(token: InsertToken): Promise<Token>;
  getTokenByValue(token: string): Promise<Token | undefined>;
  getTokensByUserId(userId: number, type?: string): Promise<Token[]>;
  markTokenAsUsed(token: string): Promise<Token>;
  deleteExpiredTokens(): Promise<void>;
  
  // Additional methods
  getUserStreak(userId: number): Promise<number>;
  
  // Session store
  sessionStore: session.Store;
}

// Import DatabaseStorage
import { DatabaseStorage } from "./db-storage";

// Create and export the database storage instance
export const storage = new DatabaseStorage();
