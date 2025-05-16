import { DateTime } from 'luxon';
import { User, Toast, InsertToast } from '@shared/schema';
import { db } from '../db';
import { eq, and, between } from 'drizzle-orm';
import { notes, toasts } from '@shared/schema';
import OpenAI from 'openai';
// Define custom API error class
export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Toast types
export type ToastRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Get the date window for a specific range type based on user preferences
 * @param range The range type (daily, weekly, monthly, yearly)
 * @param user The user with their timezone and preferences
 * @returns Start and end DateTime objects for the range
 */
export function getDateWindow(range: ToastRange, user: User) {
  const now = DateTime.now().setZone(user.timezone || 'UTC');
  
  switch (range) {
    case 'daily':
      return { 
        start: now.startOf('day'), 
        end: now.endOf('day') 
      };
      
    case 'weekly': {
      // Get preferred day of week (0 = Sunday, 6 = Saturday)
      const targetDow = user.weeklyToastDay ?? 0;          
      // Get the most recent occurrence of that day (or today if it's the target day)
      // Luxon uses 1-7 for weekdays where 1 is Monday, so we need to convert from 0-6 where 0 is Sunday
      const luxonDay = targetDow === 0 ? 7 : targetDow;
      const start = now.set({ weekday: luxonDay as 1|2|3|4|5|6|7 }).startOf('day');
      // The window is 7 days from the start
      const end = start.plus({ days: 6 }).endOf('day');
      return { start, end };
    }
      
    case 'monthly':
      return { 
        start: now.startOf('month'), 
        end: now.endOf('month') 
      };
      
    case 'yearly':
      return { 
        start: now.set({ month: 1, day: 1 }).startOf('day'),
        end: now.set({ month: 12, day: 31 }).endOf('day') 
      };
      
    default:
      throw new Error(`Unsupported range type: ${range}`);
  }
}

/**
 * Extract themes from note contents
 * @param noteContents Array of note contents
 * @returns Array of identified themes
 */
function getThemesFromNotes(noteContents: string[]): string[] {
  // Simple theme extraction logic - in production this would use NLP
  const allContent = noteContents.join(' ').toLowerCase();
  const themes = [];
  
  if (allContent.includes('work') || allContent.includes('project') || allContent.includes('job'))
    themes.push('work');
    
  if (allContent.includes('family') || allContent.includes('kids') || allContent.includes('parent'))
    themes.push('family');
    
  if (allContent.includes('exercise') || allContent.includes('workout') || allContent.includes('fitness'))
    themes.push('health');
    
  if (allContent.includes('learn') || allContent.includes('study') || allContent.includes('read'))
    themes.push('learning');
    
  if (allContent.includes('friend') || allContent.includes('social') || allContent.includes('hangout'))
    themes.push('social');
    
  if (themes.length === 0)
    themes.push('personal growth');
    
  return themes;
}

/**
 * Generate personalized toast content using OpenAI
 * @param noteContents Array of note contents
 * @returns Generated toast content
 */
async function generateToastContentWithAI(noteContents: string[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback if no API key is available
    return generateFallbackToastContent(noteContents.length, getThemesFromNotes(noteContents));
  }

  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a motivational coach who creates personalized weekly celebrations based on reflection notes. Keep the tone warm, encouraging, and celebratory. Highlight patterns, progress, and growth. Keep responses under 200 words."
        },
        {
          role: "user",
          content: `Create a personalized celebratory toast based on these reflection notes from the past week:\n\n${noteContents.join('\n\n')}`
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    return response.choices[0].message.content || generateFallbackToastContent(noteContents.length, getThemesFromNotes(noteContents));
  } catch (error) {
    console.error("Error generating toast with OpenAI:", error);
    return generateFallbackToastContent(noteContents.length, getThemesFromNotes(noteContents));
  }
}

/**
 * Generate fallback toast content without using OpenAI
 * @param noteCount Number of notes
 * @param themes Array of themes identified in the notes
 * @returns Generated toast content
 */
function generateFallbackToastContent(noteCount: number, themes: string[]): string {
  const themeText = themes.length > 0 
    ? `focusing on ${themes.join(', ')}`
    : 'focusing on your personal growth';
  
  const templates = [
    `Here's to a week of reflection and growth! You took time to document ${noteCount} moments, ${themeText}. Each note represents a step in your journey - keep building on this momentum!`,
    `Celebrating your consistency this week! With ${noteCount} reflections ${themeText}, you're creating a valuable record of your journey. These moments of awareness are powerful tools for growth.`,
    `A toast to your mindfulness! Your ${noteCount} reflections this week show your commitment to self-awareness. I notice you've been ${themeText} - these insights will serve you well as you continue forward.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate a toast for a user within a specific date range
 * @param user The user to generate a toast for
 * @param range The type of toast to generate (daily, weekly, monthly, yearly)
 * @returns The generated toast
 */
export async function generateToast(user: User, range: ToastRange): Promise<Toast> {
  // Get date window based on range and user preferences
  const { start, end } = getDateWindow(range, user);
  
  // Check for existing toast to prevent duplicates
  const existingToast = await db.query.toasts.findFirst({
    where: and(
      eq(toasts.userId, user.id),
      eq(toasts.type, range),
      eq(toasts.intervalStart, start.toJSDate())
    )
  });
  
  if (existingToast) {
    throw new ApiError(409, `A ${range} toast already exists for this period`);
  }
  
  // Get user's notes within the date range
  const userNotes = await db.query.notes.findMany({
    where: and(
      eq(notes.userId, user.id),
      between(notes.createdAt, start.toJSDate(), end.toJSDate())
    )
  });
  
  if (userNotes.length === 0) {
    throw new ApiError(400, `No notes found for the ${range} period. Add some reflections first!`);
  }
  
  // Extract note contents and IDs
  const noteContents = userNotes.map(note => note.content || '').filter(Boolean);
  const noteIds = userNotes.map(note => note.id);
  
  // Generate toast content
  const content = await generateToastContentWithAI(noteContents);
  
  // Create new toast
  const [newToast] = await db.insert(toasts)
    .values({
      userId: user.id,
      content,
      noteIds: noteIds,
      type: range,
      intervalStart: start.toJSDate(),
      intervalEnd: end.toJSDate(),
    })
    .returning();
  
  return newToast;
}

/**
 * Get the next toast date for a user based on their preferences
 * @param user The user to get the next toast date for
 * @returns The next toast date
 */
export function getNextToastDate(user: User): Date {
  // For weekly toasts, get the user's preferred day
  const preferredDay = user.weeklyToastDay ?? 0; // Default to Sunday (0)
  const now = DateTime.now().setZone(user.timezone || 'UTC');
  
  // Get the next occurrence of the preferred day
  // Luxon uses 1-7 for weekdays where 1 is Monday and 7 is Sunday
  // Convert from our 0-6 where 0 is Sunday
  const luxonDay = preferredDay === 0 ? 7 : preferredDay; 
  let nextToastDate = now.set({ weekday: luxonDay });
  
  // If today is the preferred day but it's already past a certain time (e.g., 6 PM),
  // or if the next occurrence would be in the past, move to next week
  if (nextToastDate <= now) {
    nextToastDate = nextToastDate.plus({ weeks: 1 });
  }
  
  return nextToastDate.startOf('day').toJSDate();
}