/**
 * Testing Mode Storage
 * Provides memory-based storage for testing mode to keep temporary data
 * within user sessions without affecting the database.
 */

import { Request } from 'express';
import { 
  type Note, 
  type Toast,
  type User,
  type InsertNote,
  type InsertToast
} from '@shared/schema';

// Type definitions for session data storage
declare module 'express-session' {
  interface SessionData {
    testingMode?: boolean;
    testingModeNotes?: Note[];
    testingModeToasts?: Toast[];
    testUser?: User;
  }
}

// Next auto-increment ID for notes and toasts
let nextNoteId = 5000;
let nextToastId = 1000;

/**
 * Create a testing mode user
 */
export function getTestUser(): User {
  return {
    id: 9999,
    username: 'tester',
    name: 'Tester',
    email: 'tester@example.com',
    password: '',
    verified: true,
    createdAt: new Date(),
    externalId: null,
    externalProvider: null,
    weeklyToastDay: 0,
    timezone: 'UTC'
  };
}

/**
 * Initialize testing mode storage in session if needed
 */
export function initTestingModeStorage(req: Request): void {
  if (!req.session.testingModeNotes) {
    req.session.testingModeNotes = [];
  }
  
  if (!req.session.testingModeToasts) {
    req.session.testingModeToasts = [];
  }
  
  if (!req.session.testUser) {
    req.session.testUser = getTestUser();
  }
}

/**
 * Create a note in testing mode
 */
export function createTestingModeNote(req: Request, insertNote: InsertNote): Note {
  initTestingModeStorage(req);
  
  const note: Note = {
    id: nextNoteId++,
    userId: 9999, // Test user ID
    content: insertNote.content,
    audioUrl: null,
    bundleTag: insertNote.bundleTag || null,
    createdAt: new Date()
  };
  
  req.session.testingModeNotes!.push(note);
  return note;
}

/**
 * Get notes by user in testing mode
 */
export function getTestingModeNotes(req: Request): Note[] {
  initTestingModeStorage(req);
  return req.session.testingModeNotes || [];
}

/**
 * Get today's notes in testing mode
 */
export function getTestingModeTodayNotes(req: Request): Note[] {
  initTestingModeStorage(req);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return (req.session.testingModeNotes || []).filter(note => {
    const noteDate = new Date(note.createdAt);
    noteDate.setHours(0, 0, 0, 0);
    return noteDate.getTime() === today.getTime();
  });
}

/**
 * Get notes in a date range in testing mode
 */
export function getTestingModeNotesInDateRange(
  req: Request, 
  startDate: Date, 
  endDate: Date
): Note[] {
  initTestingModeStorage(req);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return (req.session.testingModeNotes || []).filter(note => {
    const noteDate = new Date(note.createdAt);
    return noteDate >= startDate && noteDate <= endDate;
  });
}

/**
 * Create a toast in testing mode
 */
export function createTestingModeToast(req: Request, insertToast: InsertToast): Toast {
  initTestingModeStorage(req);
  
  const toast: Toast = {
    id: nextToastId++,
    userId: 9999, // Test user ID
    content: insertToast.content,
    startDate: insertToast.startDate,
    endDate: insertToast.endDate,
    audioUrl: insertToast.audioUrl || null,
    createdAt: new Date(),
    voiceId: insertToast.voiceId || null,
    processed: true
  };
  
  req.session.testingModeToasts!.push(toast);
  return toast;
}

/**
 * Get toasts by user in testing mode
 */
export function getTestingModeToasts(req: Request): Toast[] {
  initTestingModeStorage(req);
  return req.session.testingModeToasts || [];
}

/**
 * Check if request is in testing mode
 */
export function isTestingMode(req: Request): boolean {
  return Boolean(req.session.testingMode);
}