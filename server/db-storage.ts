import { 
  users, 
  notes, 
  voicePreferences, 
  toasts,
  tokens,
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
import { db, pool } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { IStorage } from "./storage";

// Create PostgreSQL session store
const PgSessionStore = connectPgSimple(session);

/**
 * Database implementation of the storage interface
 */
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Create session store with PostgreSQL
    this.sessionStore = new PgSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
      
    if (!updatedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return updatedUser;
  }
  
  async verifyUserEmail(id: number): Promise<User> {
    const [verifiedUser] = await db
      .update(users)
      .set({ verified: true })
      .where(eq(users.id, id))
      .returning();
      
    if (!verifiedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return verifiedUser;
  }

  // Note methods
  async getNoteById(id: number): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note;
  }

  async getNotesByUserId(userId: number): Promise<Note[]> {
    return db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt));
  }

  async getNotesByUserIdAndDate(userId: number, date: Date): Promise<Note[]> {
    // Create start/end date boundaries for the query
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    return db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          gte(notes.createdAt, startDate),
          lte(notes.createdAt, endDate)
        )
      )
      .orderBy(desc(notes.createdAt));
  }

  async getNotesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<Note[]> {
    return db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          gte(notes.createdAt, startDate),
          lte(notes.createdAt, endDate)
        )
      )
      .orderBy(desc(notes.createdAt));
  }

  async getRecentNotesByUserId(userId: number, count: number): Promise<Note[]> {
    return db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt))
      .limit(count);
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values(insertNote).returning();
    return note;
  }

  async updateNote(id: number, updateData: Partial<InsertNote>): Promise<Note> {
    const [updatedNote] = await db
      .update(notes)
      .set(updateData)
      .where(eq(notes.id, id))
      .returning();
      
    if (!updatedNote) {
      throw new Error(`Note with id ${id} not found`);
    }
    
    return updatedNote;
  }

  async deleteNote(id: number): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  // Voice preference methods
  async getVoicePreferenceByUserId(userId: number): Promise<VoicePreference | undefined> {
    const [preference] = await db
      .select()
      .from(voicePreferences)
      .where(eq(voicePreferences.userId, userId));
      
    return preference;
  }

  async createVoicePreference(insertPreference: InsertVoicePreference): Promise<VoicePreference> {
    const [preference] = await db
      .insert(voicePreferences)
      .values(insertPreference)
      .returning();
      
    return preference;
  }

  async updateVoicePreference(id: number, updateData: Partial<InsertVoicePreference>): Promise<VoicePreference> {
    const [updatedPreference] = await db
      .update(voicePreferences)
      .set(updateData)
      .where(eq(voicePreferences.id, id))
      .returning();
      
    if (!updatedPreference) {
      throw new Error(`Voice preference with id ${id} not found`);
    }
    
    return updatedPreference;
  }

  // Toast methods
  async getToastById(id: number): Promise<Toast | undefined> {
    const [toast] = await db.select().from(toasts).where(eq(toasts.id, id));
    return toast;
  }

  async getToastsByUserId(userId: number): Promise<Toast[]> {
    return db
      .select()
      .from(toasts)
      .where(eq(toasts.userId, userId))
      .orderBy(desc(toasts.createdAt));
  }

  async createToast(insertToast: InsertToast): Promise<Toast> {
    const [toast] = await db.insert(toasts).values(insertToast).returning();
    return toast;
  }

  async updateToast(id: number, updateData: Partial<InsertToast>): Promise<Toast> {
    const [updatedToast] = await db
      .update(toasts)
      .set(updateData)
      .where(eq(toasts.id, id))
      .returning();
      
    if (!updatedToast) {
      throw new Error(`Toast with id ${id} not found`);
    }
    
    return updatedToast;
  }

  // Token methods
  async createToken(insertToken: InsertToken): Promise<Token> {
    const [token] = await db.insert(tokens).values(insertToken).returning();
    return token;
  }

  async getTokenByValue(tokenValue: string): Promise<Token | undefined> {
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.token, tokenValue));
      
    return token;
  }

  async getTokensByUserId(userId: number, type?: string): Promise<Token[]> {
    if (type) {
      return db
        .select()
        .from(tokens)
        .where(and(eq(tokens.userId, userId), eq(tokens.type, type)))
        .orderBy(desc(tokens.createdAt));
    }
    
    return db
      .select()
      .from(tokens)
      .where(eq(tokens.userId, userId))
      .orderBy(desc(tokens.createdAt));
  }

  async markTokenAsUsed(tokenValue: string): Promise<Token> {
    const [updatedToken] = await db
      .update(tokens)
      .set({ used: true })
      .where(eq(tokens.token, tokenValue))
      .returning();
      
    if (!updatedToken) {
      throw new Error(`Token ${tokenValue} not found`);
    }
    
    return updatedToken;
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    await db.delete(tokens).where(lte(tokens.expiresAt, now));
  }

  // Calculate user streak
  async getUserStreak(userId: number): Promise<number> {
    // Get all notes for this user
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