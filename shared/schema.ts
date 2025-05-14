import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content"),
  audioUrl: text("audio_url"),
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
});

export const toasts = pgTable("toasts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  audioUrl: text("audio_url"),
  noteIds: json("note_ids").$type<number[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  shared: boolean("shared").notNull().default(false),
  shareUrl: text("share_url"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  userId: true,
  content: true,
  audioUrl: true,
});

export const insertVoicePreferenceSchema = createInsertSchema(voicePreferences).pick({
  userId: true,
  voiceStyle: true,
  toastDay: true,
  toastTone: true,
  dailyReminder: true,
  toastNotification: true,
  emailNotifications: true,
});

export const insertToastSchema = createInsertSchema(toasts).pick({
  userId: true,
  content: true,
  audioUrl: true,
  noteIds: true,
  shared: true,
  shareUrl: true,
});

// Extended schemas for validation
export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertVoicePreference = z.infer<typeof insertVoicePreferenceSchema>;
export type InsertToast = z.infer<typeof insertToastSchema>;

export type User = typeof users.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type VoicePreference = typeof voicePreferences.$inferSelect;
export type Toast = typeof toasts.$inferSelect;

export type RegisterUser = z.infer<typeof registerSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
