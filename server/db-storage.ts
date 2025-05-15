import { 
  users, 
  notes, 
  voicePreferences, 
  toasts,
  tokens,
  friendships,
  sharedToasts,
  toastReactions,
  toastComments,
  badges,
  userBadges,
  userActivity,
  type User, 
  type Note, 
  type VoicePreference, 
  type Toast,
  type Token,
  type Friendship,
  type SharedToast,
  type ToastReaction,
  type ToastComment,
  type Badge,
  type UserBadge,
  type UserActivity,
  type InsertUser, 
  type InsertNote, 
  type InsertVoicePreference, 
  type InsertToast,
  type InsertToken,
  type InsertFriendship,
  type InsertSharedToast,
  type InsertToastReaction,
  type InsertToastComment,
  type InsertBadge,
  type InsertUserBadge,
  type InsertUserActivity
} from "@shared/schema";
import { 
  getBadgeById, 
  getBadgesByCategory, 
  getUserBadges, 
  getUserBadgeByIds, 
  createUserBadge, 
  markUserBadgeSeen, 
  getUnseenUserBadges, 
  logUserActivity, 
  getUserActivity, 
  getWeeklyActivityCount, 
  getMonthlyActivityCount,
  checkAndAwardBadges
} from './db-storage-gamification';
import { db, pool } from "./db";
import { eq, and, gte, lte, desc, asc, or, inArray } from "drizzle-orm";
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

  // Friendship methods
  async getFriendshipById(id: number): Promise<Friendship | undefined> {
    const [friendship] = await db.select().from(friendships).where(eq(friendships.id, id));
    return friendship;
  }

  async getFriendshipsByUserId(userId: number): Promise<Friendship[]> {
    // Get all friendships where the user is either the initiator or the recipient
    const userFriendships = await db.select().from(friendships)
      .where(eq(friendships.userId, userId));
    
    const friendUserFriendships = await db.select().from(friendships)
      .where(eq(friendships.friendId, userId));
    
    return [...userFriendships, ...friendUserFriendships];
  }

  async getFriendshipByUserIds(userId: number, friendId: number): Promise<Friendship | undefined> {
    // Check in both directions
    const [friendship] = await db.select().from(friendships)
      .where(
        or(
          and(
            eq(friendships.userId, userId),
            eq(friendships.friendId, friendId)
          ),
          and(
            eq(friendships.userId, friendId),
            eq(friendships.friendId, userId)
          )
        )
      );
    
    return friendship;
  }

  async getFriendsByUserId(userId: number, status: string = 'accepted'): Promise<User[]> {
    // Get IDs of users who are friends with this user
    // First, get friendships where user is the initiator
    const initiatedFriendships = await db.select({
      friendId: friendships.friendId
    }).from(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.status, status)
        )
      );
    
    // Then, get friendships where user is the recipient
    const receivedFriendships = await db.select({
      friendId: friendships.userId
    }).from(friendships)
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, status)
        )
      );
    
    // Combine friend IDs
    const friendIds = [
      ...initiatedFriendships.map(f => f.friendId),
      ...receivedFriendships.map(f => f.friendId)
    ];
    
    // Get the actual user records
    if (friendIds.length === 0) {
      return [];
    }
    
    const friends = await db.select().from(users)
      .where(
        inArray(users.id, friendIds)
      );
    
    return friends;
  }

  async createFriendship(friendship: InsertFriendship): Promise<Friendship> {
    const [newFriendship] = await db.insert(friendships)
      .values(friendship)
      .returning();
    
    return newFriendship;
  }

  async updateFriendshipStatus(id: number, status: string): Promise<Friendship> {
    const [updatedFriendship] = await db.update(friendships)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(friendships.id, id))
      .returning();
    
    return updatedFriendship;
  }

  async deleteFriendship(id: number): Promise<void> {
    await db.delete(friendships)
      .where(eq(friendships.id, id));
  }

  // Shared toast methods
  async getSharedToastById(id: number): Promise<SharedToast | undefined> {
    const [sharedToast] = await db.select().from(sharedToasts).where(eq(sharedToasts.id, id));
    return sharedToast;
  }

  async getSharedToastByShareCode(shareCode: string): Promise<SharedToast | undefined> {
    const [sharedToast] = await db.select().from(sharedToasts).where(eq(sharedToasts.shareCode, shareCode));
    return sharedToast;
  }

  async getSharedToastsByToastId(toastId: number): Promise<SharedToast[]> {
    return await db.select().from(sharedToasts).where(eq(sharedToasts.toastId, toastId));
  }

  async createSharedToast(sharedToast: InsertSharedToast): Promise<SharedToast> {
    const [newSharedToast] = await db.insert(sharedToasts)
      .values(sharedToast)
      .returning();
    
    return newSharedToast;
  }

  async updateSharedToast(id: number, updateData: Partial<InsertSharedToast>): Promise<SharedToast> {
    const [updatedSharedToast] = await db.update(sharedToasts)
      .set(updateData)
      .where(eq(sharedToasts.id, id))
      .returning();
    
    return updatedSharedToast;
  }

  async deleteSharedToast(id: number): Promise<void> {
    await db.delete(sharedToasts)
      .where(eq(sharedToasts.id, id));
  }

  async incrementSharedToastViewCount(id: number): Promise<SharedToast> {
    const [sharedToast] = await db.select().from(sharedToasts).where(eq(sharedToasts.id, id));
    
    if (!sharedToast) {
      throw new Error('Shared toast not found');
    }
    
    const [updatedSharedToast] = await db.update(sharedToasts)
      .set({ 
        viewCount: sharedToast.viewCount + 1
      })
      .where(eq(sharedToasts.id, id))
      .returning();
    
    return updatedSharedToast;
  }

  // Toast reaction methods
  async getToastReactionById(id: number): Promise<ToastReaction | undefined> {
    const [reaction] = await db.select().from(toastReactions).where(eq(toastReactions.id, id));
    return reaction;
  }

  async getToastReactionsByToastId(toastId: number): Promise<ToastReaction[]> {
    return await db.select().from(toastReactions).where(eq(toastReactions.toastId, toastId));
  }

  async getToastReactionByUserAndToast(userId: number, toastId: number): Promise<ToastReaction | undefined> {
    const [reaction] = await db.select().from(toastReactions)
      .where(
        and(
          eq(toastReactions.userId, userId),
          eq(toastReactions.toastId, toastId)
        )
      );
    
    return reaction;
  }

  async createToastReaction(reaction: InsertToastReaction): Promise<ToastReaction> {
    const [newReaction] = await db.insert(toastReactions)
      .values(reaction)
      .returning();
    
    return newReaction;
  }

  async updateToastReaction(id: number, reaction: string): Promise<ToastReaction> {
    const [updatedReaction] = await db.update(toastReactions)
      .set({ reaction })
      .where(eq(toastReactions.id, id))
      .returning();
    
    return updatedReaction;
  }

  async deleteToastReaction(id: number): Promise<void> {
    await db.delete(toastReactions)
      .where(eq(toastReactions.id, id));
  }

  // Toast comment methods
  async getToastCommentById(id: number): Promise<ToastComment | undefined> {
    const [comment] = await db.select().from(toastComments).where(eq(toastComments.id, id));
    return comment;
  }

  async getToastCommentsByToastId(toastId: number): Promise<ToastComment[]> {
    return await db.select().from(toastComments)
      .where(eq(toastComments.toastId, toastId))
      .orderBy(asc(toastComments.createdAt));
  }

  async createToastComment(comment: InsertToastComment): Promise<ToastComment> {
    const [newComment] = await db.insert(toastComments)
      .values(comment)
      .returning();
    
    return newComment;
  }

  async updateToastComment(id: number, comment: string): Promise<ToastComment> {
    const [updatedComment] = await db.update(toastComments)
      .set({ 
        comment,
        updatedAt: new Date()
      })
      .where(eq(toastComments.id, id))
      .returning();
    
    return updatedComment;
  }

  async deleteToastComment(id: number): Promise<void> {
    await db.delete(toastComments)
      .where(eq(toastComments.id, id));
  }

  // Badge methods
  async getBadgeById(id: number): Promise<Badge | undefined> {
    return await import('./db-storage-gamification').then(mod => mod.getBadgeById(id));
  }

  async getBadgesByCategory(category: string): Promise<Badge[]> {
    return await import('./db-storage-gamification').then(mod => mod.getBadgesByCategory(category));
  }
  
  async getBadgeByRequirement(requirement: string): Promise<Badge | undefined> {
    return await import('./db-storage-gamification').then(mod => mod.getBadgeByRequirement(requirement));
  }
  
  async createBadge(badge: InsertBadge): Promise<Badge> {
    return await import('./db-storage-gamification').then(mod => mod.createBadge(badge));
  }
  
  async getUserNotesCount(userId: number): Promise<number> {
    return await import('./db-storage-gamification').then(mod => mod.getUserNotesCount(userId));
  }

  async getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    return await import('./db-storage-gamification').then(mod => mod.getUserBadges(userId));
  }

  async getUserBadgeByIds(userId: number, badgeId: number): Promise<UserBadge | undefined> {
    return await import('./db-storage-gamification').then(mod => mod.getUserBadgeByIds(userId, badgeId));
  }

  async createUserBadge(userBadge: InsertUserBadge): Promise<UserBadge> {
    return await import('./db-storage-gamification').then(mod => mod.createUserBadge(userBadge));
  }
  
  async awardBadge(userId: number, badgeId: number): Promise<UserBadge> {
    return await import('./db-storage-gamification').then(mod => mod.awardBadge(userId, badgeId));
  }

  async markUserBadgeSeen(id: number): Promise<UserBadge> {
    return await import('./db-storage-gamification').then(mod => mod.markUserBadgeSeen(id));
  }

  async getUnseenUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    return await import('./db-storage-gamification').then(mod => mod.getUnseenUserBadges(userId));
  }
  
  async checkAndAwardBadges(userId: number): Promise<UserBadge[]> {
    return await import('./db-storage-gamification').then(mod => mod.checkAndAwardBadges(userId));
  }

  // Activity and Analytics methods
  async logUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    return logUserActivity(activity);
  }

  async getUserActivity(userId: number, type?: string, limit?: number): Promise<UserActivity[]> {
    return getUserActivity(userId, type, limit);
  }

  async getWeeklyActivityCount(userId: number, activityType: string): Promise<number> {
    return getWeeklyActivityCount(userId, activityType);
  }

  async getMonthlyActivityCount(userId: number, activityType: string): Promise<number> {
    return getMonthlyActivityCount(userId, activityType);
  }

  // Check and award badges based on user activity
  async checkAndAwardBadges(userId: number): Promise<UserBadge[]> {
    return checkAndAwardBadges(userId);
  }
}