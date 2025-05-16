import { DateTime } from 'luxon';
import { db } from '../db';
import { toasts, notes, users } from '@shared/schema';
import { eq, and, between, desc } from 'drizzle-orm';
import { Toast, User } from '@shared/schema';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ToastRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Get the user's timezone (defaults to UTC)
 */
async function getUserTimezone(user: User): Promise<string> {
  try {
    // Check if timezone property exists on user
    if ('timezone' in user && user.timezone) {
      return user.timezone;
    }
    
    // Check voice preferences table for timezone settings
    const [preference] = await db.execute(sql`
      SELECT timezone FROM voice_preferences 
      WHERE user_id = ${user.id} 
      AND timezone IS NOT NULL
    `);
    
    if (preference && preference.timezone) {
      return preference.timezone;
    }
  } catch (error) {
    console.error("Error getting user timezone:", error);
  }
  
  // Default to UTC if not found
  return 'UTC';
}

/**
 * Get preferred day of week for weekly toasts (defaults to Sunday - 0)
 */
async function getPreferredWeeklyDay(user: User): Promise<number> {
  // If weeklyToastDay is available directly on user object
  if (user && 'weeklyToastDay' in user && user.weeklyToastDay !== null) {
    return user.weeklyToastDay;
  }
  
  // Default to Sunday (0) if not found
  return 0;
}

/**
 * Get date range for a toast type based on user preferences
 */
async function getDateRange(user: User, toastType: ToastRange) {
  const userId = user.id;
  const timezone = await getUserTimezone(user);
  const now = DateTime.now().setZone(timezone);
  
  let start: DateTime;
  let end: DateTime;
  
  switch (toastType) {
    case 'daily':
      // Daily toast is for current day
      start = now.startOf('day');
      end = now.endOf('day');
      break;
      
    case 'weekly':
      // Weekly toast is based on preferred day
      const preferredDay = await getPreferredWeeklyDay(user);
      // Convert to Luxon day format (1-7 where 7 is Sunday)
      const luxonDay = preferredDay === 0 ? 7 : preferredDay;
      
      // Get most recent occurrence of preferred day
      start = now.set({ weekday: luxonDay as 1|2|3|4|5|6|7 }).startOf('day');
      
      // If it's in the future, get previous week
      if (start > now) {
        start = start.minus({ weeks: 1 });
      }
      
      // Weekly window goes back 7 days from the preferred day
      end = start.minus({ days: 1 }).endOf('day');
      start = start.minus({ days: 6 }).startOf('day');
      break;
      
    case 'monthly':
      // Monthly toast goes from 1st of month to now
      start = now.startOf('month');
      end = now.endOf('day');
      break;
      
    case 'yearly':
      // Yearly toast goes from Jan 1 to now
      start = now.startOf('year');
      end = now.endOf('day');
      break;
      
    default:
      throw new Error(`Unsupported toast type: ${toastType}`);
  }
  
  return {
    start: start.toJSDate(),
    end: end.toJSDate()
  };
}

/**
 * Check if a toast already exists for the given time period and toast type
 */
async function checkToastExists(userId: number, toastType: ToastRange, startDate: Date, endDate: Date): Promise<boolean> {
  try {
    // First try using toast type and interval columns if they exist
    try {
      const typeResult = await db.select({ id: toasts.id })
        .from(toasts)
        .where(and(
          eq(toasts.userId, userId),
          eq(toasts.type, toastType),
          between(toasts.createdAt, startDate, endDate)
        ))
        .limit(1);
      
      return typeResult.length > 0;
    } catch (e) {
      // If the query fails (likely because columns don't exist), fall back to creation date
      console.log("Falling back to creation date for toast existence check");
    }
    
    // Fall back to checking by creation date
    const result = await db.select({ id: toasts.id })
      .from(toasts)
      .where(and(
        eq(toasts.userId, userId),
        between(toasts.createdAt, startDate, endDate)
      ))
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error('Error checking for existing toast:', error);
    return false;
  }
}

/**
 * Generate personalized toast content using OpenAI
 */
async function generateToastContent(noteContents: string[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY || noteContents.length === 0) {
    return generateFallbackToastContent(noteContents.length);
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
          content: `Create a personalized celebratory toast based on these reflection notes from the past ${noteContents.length > 1 ? 'period' : 'entry'}:\n\n${noteContents.join('\n\n')}`
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    return response.choices[0].message.content || generateFallbackToastContent(noteContents.length);
  } catch (error) {
    console.error("Error generating toast with OpenAI:", error);
    return generateFallbackToastContent(noteContents.length);
  }
}

/**
 * Generate fallback toast content without using OpenAI
 */
function generateFallbackToastContent(noteCount: number): string {
  const templates = [
    `Here's to a period of reflection and growth! You took time to document ${noteCount} moment${noteCount !== 1 ? 's' : ''} recently. Each note represents a step in your journey - keep building on this momentum!`,
    `Celebrating your consistency! With ${noteCount} reflection${noteCount !== 1 ? 's' : ''}, you're creating a valuable record of your journey. These moments of awareness are powerful tools for growth.`,
    `A toast to your mindfulness! Your ${noteCount} reflection${noteCount !== 1 ? 's' : ''} show your commitment to self-awareness. These insights will serve you well as you continue forward.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate a toast for a user with the specified range type
 */
export async function generateToast(user: User, toastType: ToastRange): Promise<Toast> {
  const userId = user.id;
  
  // Get date range based on toast type and user preferences
  const { start, end } = await getDateRange(user, toastType);
  
  // Check if a toast already exists for this period and type
  const toastExists = await checkToastExists(userId, toastType, start, end);
  if (toastExists) {
    throw new Error(`A ${toastType} toast has already been generated for this period`);
  }
  
  // Get user notes for the date range
  const userNotes = await db.select()
    .from(notes)
    .where(and(
      eq(notes.userId, userId),
      between(notes.createdAt, start, end)
    ));
  
  if (userNotes.length === 0) {
    throw new Error(`No notes found for this ${toastType} period. Add some reflections first!`);
  }
  
  // Extract note contents and IDs
  const noteContents = userNotes.map(note => note.content || '').filter(Boolean);
  const noteIds = userNotes.map(note => note.id);
  
  // Generate toast content
  const content = await generateToastContent(noteContents);
  
  // Create toast record
  try {
    // Try inserting with toast type field
    const [newToast] = await db.insert(toasts)
      .values({
        userId,
        content,
        noteIds,
        type: toastType,
      })
      .returning();
    
    return newToast;
  } catch (e) {
    // Fall back to original schema if type field doesn't exist
    console.log("Falling back to original schema for toast creation");
    const [newToast] = await db.insert(toasts)
      .values({
        userId,
        content,
        noteIds,
      })
      .returning();
    
    return newToast;
  }
}