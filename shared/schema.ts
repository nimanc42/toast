import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  verified: boolean("verified").notNull().default(false),
  externalId: text("external_id").unique(), // ID from external auth provider (Supabase, Google, etc.)
  externalProvider: text("external_provider"), // Name of the provider (google, apple, etc.)
  weeklyToastDay: integer("weekly_toast_day").default(0), // 0 = Sunday, 6 = Saturday
  timezone: text("timezone").default("Australia/Perth"),
  toastHour: integer("toast_hour").default(9), // Hour of day for toast generation (0-23)
  toastMinute: integer("toast_minute").default(0), // Minute of hour for toast generation (0-59)
  firstLogin: boolean("first_login").notNull().default(true), // Track if this is the first time a user logs in
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content"),
  audioUrl: text("audio_url"),
  bundleTag: text("bundle_tag"), // TODO (BundledAway): activate bundle tag feature for memory grouping
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voicePreferences = pgTable("voice_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  voiceStyle: text("voice_style").notNull().default("motivational"),
  toastDay: text("toast_day").notNull().default("Sunday"),
  toastTone: text("toast_tone").notNull().default("auto"),
  dailyReminder: boolean("daily_reminder").notNull().default(true),
  toastNotification: boolean("toast_notification").notNull().default(true),
  emailNotifications: boolean("email_notifications").notNull().default(false),
  dailyReminderHour: integer("daily_reminder_hour").notNull().default(9),
});

export const toasts = pgTable("toasts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  audioUrl: text("audio_url"),
  weekStartDate: timestamp("week_start_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // 'verification' or 'password-reset'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
});

// Friendships/connections between users
export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  friendId: integer("friend_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, blocked
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Enforce uniqueness: A user can only have one relationship with another user
    userFriendUnique: uniqueIndex("user_friend_unique_idx").on(table.userId, table.friendId),
  };
});

// Shared toast settings
export const sharedToasts = pgTable("shared_toasts", {
  id: serial("id").primaryKey(),
  toastId: integer("toast_id").notNull().references(() => toasts.id),
  shareCode: text("share_code").notNull().unique(), // Unique code for the share link
  visibility: text("visibility").notNull().default("friends-only"), // public, friends-only, link-only
  allowComments: boolean("allow_comments").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  viewCount: integer("view_count").notNull().default(0),
});

// Reactions to shared toasts (likes, etc.)
export const toastReactions = pgTable("toast_reactions", {
  id: serial("id").primaryKey(),
  toastId: integer("toast_id").notNull().references(() => toasts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  reaction: text("reaction").notNull(), // like, love, applause, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Each user can only have one reaction per toast
    userToastUnique: uniqueIndex("user_toast_unique_idx").on(table.userId, table.toastId),
  };
});

// Comments on shared toasts
export const toastComments = pgTable("toast_comments", {
  id: serial("id").primaryKey(),
  toastId: integer("toast_id").notNull().references(() => toasts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Badge definitions (system badges)
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // SVG or icon name
  category: text("category").notNull(), // streak, sharing, notes, etc.
  requirement: text("requirement").notNull(), // key for looking up badges by specific requirements
  threshold: integer("threshold").notNull(), // e.g., 7 for "7-day streak"
  metadata: json("metadata").$type<Record<string, any>>(), // flexible data for badge requirements
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User badge achievements
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => badges.id),
  seen: boolean("seen").notNull().default(false), // for notification purposes
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Each user can earn a specific badge only once
    userBadgeUnique: uniqueIndex("user_badge_unique_idx").on(table.userId, table.badgeId),
  };
});

// User activity logs for analytics
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  activityType: text("activity_type").notNull(), // login, note-create, toast-view, etc.
  metadata: json("metadata").$type<Record<string, any>>(), // flexible data structure for different activity types
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Anonymous feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  text: text("text"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reflectionReviews = pgTable("reflection_reviews", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  reviewText: text("review_text").notNull(),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  externalId: true,
  externalProvider: true,
  weeklyToastDay: true,
  timezone: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  userId: true,
  content: true,
  audioUrl: true,
  bundleTag: true,
});

export const insertVoicePreferenceSchema = createInsertSchema(voicePreferences).pick({
  userId: true,
  voiceStyle: true,
  toastDay: true,
  toastTone: true,
  dailyReminder: true,
  toastNotification: true,
  emailNotifications: true,
  dailyReminderHour: true,
});

export const insertToastSchema = createInsertSchema(toasts).pick({
  userId: true,
  content: true,
  audioUrl: true,
  weekStartDate: true,
});

export const insertTokenSchema = createInsertSchema(tokens).pick({
  userId: true,
  token: true,
  type: true,
  expiresAt: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).pick({
  userId: true,
  friendId: true,
  status: true,
});

export const insertSharedToastSchema = createInsertSchema(sharedToasts).pick({
  toastId: true,
  shareCode: true,
  visibility: true,
  allowComments: true,
  expiresAt: true,
});

export const insertToastReactionSchema = createInsertSchema(toastReactions).pick({
  toastId: true,
  userId: true,
  reaction: true,
});

export const insertToastCommentSchema = createInsertSchema(toastComments).pick({
  toastId: true,
  userId: true,
  comment: true,
});

export const insertBadgeSchema = createInsertSchema(badges).pick({
  name: true,
  description: true,
  icon: true,
  category: true,
  requirement: true,
  threshold: true,
  metadata: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).pick({
  userId: true,
  badgeId: true,
  seen: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivity).pick({
  userId: true,
  activityType: true,
  metadata: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).pick({
  text: true,
  audioUrl: true,
});

// Extended schemas for validation
export const registerSchema = insertUserSchema.extend({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid("Invalid token format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const verifyEmailSchema = z.object({
  token: z.string().uuid("Invalid token format"),
});

// Share toast schema
export const shareToastSchema = z.object({
  toastId: z.number(),
  visibility: z.enum(["public", "friends-only", "link-only"]).default("friends-only"),
  allowComments: z.boolean().default(true),
  expiresAt: z.date().optional(),
});

// Add friend schema
export const addFriendSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

// Update friendship status schema
export const updateFriendshipSchema = z.object({
  friendshipId: z.number(),
  status: z.enum(["accepted", "rejected", "blocked"]),
});

// Add reaction schema
export const addReactionSchema = z.object({
  toastId: z.number(),
  reaction: z.string().min(1, "Reaction is required"),
});

// Add comment schema
export const addCommentSchema = z.object({
  toastId: z.number(),
  comment: z.string().min(1, "Comment cannot be empty").max(500, "Comment too long (max 500 characters)"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertVoicePreference = z.infer<typeof insertVoicePreferenceSchema>;
export type InsertToast = z.infer<typeof insertToastSchema>;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type InsertSharedToast = z.infer<typeof insertSharedToastSchema>;
export type InsertToastReaction = z.infer<typeof insertToastReactionSchema>;
export type InsertToastComment = z.infer<typeof insertToastCommentSchema>;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;

export type User = typeof users.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type VoicePreference = typeof voicePreferences.$inferSelect;
export type Toast = typeof toasts.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type SharedToast = typeof sharedToasts.$inferSelect;
export type ToastReaction = typeof toastReactions.$inferSelect;
export type ToastComment = typeof toastComments.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type UserActivity = typeof userActivity.$inferSelect;

export type RegisterUser = z.infer<typeof registerSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type ForgotPasswordUser = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordUser = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailUser = z.infer<typeof verifyEmailSchema>;
export type ShareToast = z.infer<typeof shareToastSchema>;
export type AddFriend = z.infer<typeof addFriendSchema>;
export type UpdateFriendship = z.infer<typeof updateFriendshipSchema>;
export type AddReaction = z.infer<typeof addReactionSchema>;
export type AddComment = z.infer<typeof addCommentSchema>;