import { 
  type User, 
  type Note, 
  type VoicePreference, 
  type Toast,
  type Token,
  type Friendship,
  type SharedToast,
  type ToastReaction,
  type ToastComment,
  type InsertUser, 
  type InsertNote, 
  type InsertVoicePreference, 
  type InsertToast,
  type InsertToken,
  type InsertFriendship,
  type InsertSharedToast,
  type InsertToastReaction,
  type InsertToastComment
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
  
  // Friendship methods
  getFriendshipById(id: number): Promise<Friendship | undefined>;
  getFriendshipsByUserId(userId: number): Promise<Friendship[]>;
  getFriendshipByUserIds(userId: number, friendId: number): Promise<Friendship | undefined>;
  getFriendsByUserId(userId: number, status?: string): Promise<User[]>;
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  updateFriendshipStatus(id: number, status: string): Promise<Friendship>;
  deleteFriendship(id: number): Promise<void>;
  
  // Shared toast methods
  getSharedToastById(id: number): Promise<SharedToast | undefined>;
  getSharedToastByShareCode(shareCode: string): Promise<SharedToast | undefined>;
  getSharedToastsByToastId(toastId: number): Promise<SharedToast[]>;
  createSharedToast(sharedToast: InsertSharedToast): Promise<SharedToast>;
  updateSharedToast(id: number, updateData: Partial<InsertSharedToast>): Promise<SharedToast>;
  deleteSharedToast(id: number): Promise<void>;
  incrementSharedToastViewCount(id: number): Promise<SharedToast>;
  
  // Toast reaction methods
  getToastReactionById(id: number): Promise<ToastReaction | undefined>;
  getToastReactionsByToastId(toastId: number): Promise<ToastReaction[]>;
  getToastReactionByUserAndToast(userId: number, toastId: number): Promise<ToastReaction | undefined>;
  createToastReaction(reaction: InsertToastReaction): Promise<ToastReaction>;
  updateToastReaction(id: number, reaction: string): Promise<ToastReaction>;
  deleteToastReaction(id: number): Promise<void>;
  
  // Toast comment methods
  getToastCommentById(id: number): Promise<ToastComment | undefined>;
  getToastCommentsByToastId(toastId: number): Promise<ToastComment[]>;
  createToastComment(comment: InsertToastComment): Promise<ToastComment>;
  updateToastComment(id: number, comment: string): Promise<ToastComment>;
  deleteToastComment(id: number): Promise<void>;
  
  // Badge methods
  getBadgeById(id: number): Promise<Badge | undefined>;
  getBadgesByCategory(category: string): Promise<Badge[]>;
  getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]>;
  getUserBadgeByIds(userId: number, badgeId: number): Promise<UserBadge | undefined>;
  createUserBadge(userBadge: InsertUserBadge): Promise<UserBadge>;
  markUserBadgeSeen(id: number): Promise<UserBadge>;
  getUnseenUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]>;
  
  // Activity and Analytics methods
  logUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivity(userId: number, type?: string, limit?: number): Promise<UserActivity[]>;
  getWeeklyActivityCount(userId: number, activityType: string): Promise<number>;
  getMonthlyActivityCount(userId: number, activityType: string): Promise<number>;
  
  // Additional methods
  getUserStreak(userId: number): Promise<number>;
  
  // Session store
  sessionStore: session.Store;
}

// Import DatabaseStorage
import { DatabaseStorage } from "./db-storage";

// Create and export the database storage instance
export const storage = new DatabaseStorage();
