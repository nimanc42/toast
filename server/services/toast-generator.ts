import { DateTime } from 'luxon';
import { User, Toast, InsertToast } from '@shared/schema';
import { db } from '../db';
import { eq, and, between, desc, sql } from 'drizzle-orm';
import { notes, toasts, users } from '@shared/schema';
import OpenAI from 'openai';
import { CONFIG } from '../config';
// Import the speech generation function
import { generateSpeech, getVoiceId } from './elevenlabs';

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

// Define toast prompt type for type safety
export type ToastPromptStyle = 'system' | 'weekly' | 'uplifting' | 'reflective' | 'structured';

// Toast prompt templates - easy to customize
export const TOAST_PROMPTS: Record<ToastPromptStyle, string> = {
  // System message that defines the AI's role and tone
  system: "You are a warm, encouraging toastmaster who creates personal, meaningful celebrations.",
  
  // Main prompt template for generating weekly toasts - a more direct and personalized format
  weekly: `
You are a warm, encouraging toastmaster.  
Write a short, uplifting weekly toast in SECOND PERSON, addressed directly to the user.
• Use "you" / "your" throughout (no "he/she/they").  
• Begin with a friendly greeting.  
• Highlight the specific achievements and moments from this week's reflections.  
• Express genuine pride and admiration (e.g., "I am so proud of you…").  
• Keep the tone supportive, motivational, and personal—like a mentor speaking directly.  
• Keep it under 90 seconds if read aloud.
• End with a heartfelt "Cheers!" or similar closing.

The reflections for this week are: 
[REFLECTIONS]
`,
  
  // More energetic and action-oriented style
  uplifting: `
You are a warm, encouraging toastmaster.  
Write an ENERGETIC and MOTIVATING weekly toast in SECOND PERSON, addressed directly to the user.
• Use "you" / "your" throughout (no "he/she/they").  
• Begin with an enthusiastic greeting.  
• Emphasize achievements, wins, and positive actions from the weekly reflections.
• Use motivational language that inspires continued action.  
• Keep the tone energetic, exciting, and forward-looking—like a coach celebrating a victory.  
• Keep it under 90 seconds if read aloud.
• End with an inspiring call to action or celebratory closing.

The reflections for this week are:
[REFLECTIONS]
`,
  
  // More thoughtful and introspective style
  reflective: `
You are a warm, encouraging toastmaster.  
Write a THOUGHTFUL, CONTEMPLATIVE weekly toast in SECOND PERSON, addressed directly to the user.
• Use "you" / "your" throughout (no "he/she/they").  
• Begin with a gentle, considerate greeting.  
• Focus on personal growth, learning moments, and wisdom gained from the reflections.
• Highlight insights rather than just achievements.
• Create a reflective mood that encourages deeper thought.
• Keep the tone warm, wise, and supportive—like a mentor sharing wisdom.  
• Keep it under 90 seconds if read aloud.
• End with a thoughtful closing that invites continued reflection.

The reflections for this week are:
[REFLECTIONS]
`,

  // New JSON-structured format for more precise control
  structured: `
You are writing a toast addressed directly to the user. Use second-person "you" and celebrate their recent achievements and reflections. Mention specific positive actions or growth moments the user has shared. The tone should be heartfelt, sincere, and motivational, about 200 words.

The reflections for this week are:
[REFLECTIONS]
`
};

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
 * Get date range for weekly toast generation
 * This is a simplified version that doesn't rely on user preferences yet
 */
export function getWeeklyDateRange() {
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - 7); // 7 days ago
  
  return { 
    start: startDate, 
    end: now 
  };
}

/**
 * Check if a toast already exists for the given time period
 * Respects the testing mode configuration
 */
export async function checkToastExists(userId: number): Promise<boolean> {
  // In testing mode, always return false to allow toast generation regardless of timing
  if (CONFIG.TESTING_MODE) {
    console.log('[Toast Generator] Testing mode enabled - bypassing toast existence check');
    return false;
  }
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const result = await db.select()
    .from(toasts)
    .where(and(
      eq(toasts.userId, userId),
      between(toasts.createdAt, oneWeekAgo, new Date())
    ));
  
  return result.length > 0;
}

/**
 * Extract themes from note contents
 * @param noteContents Array of note contents
 * @returns Array of identified themes
 */
export function getThemesFromNotes(noteContents: string[]): string[] {
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
 * Generate personalized toast content using OpenAI with customizable style
 * @param noteContents Array of user's reflection notes for the period
 * @param toastStyle Optional style of toast to generate (weekly, uplifting, reflective, structured)
 * @param userName Optional user's name for personalized greeting
 * @returns Generated toast content
 */
async function generateToastContent(
  noteContents: string[], 
  toastStyle: ToastPromptStyle | string = 'weekly',
  userName: string = ''
): Promise<string> {
  if (!process.env.OPENAI_API_KEY || noteContents.length === 0) {
    return generateFallbackToastContent(noteContents.length, []);
  }

  try {
    // Check if the toast style is a valid style, otherwise use weekly
    const validStyle = (Object.keys(TOAST_PROMPTS) as ToastPromptStyle[]).includes(toastStyle as ToastPromptStyle)
      ? toastStyle as ToastPromptStyle
      : 'weekly';
    
    // Get the appropriate prompt template
    let promptTemplate = TOAST_PROMPTS[validStyle];
    
    // Insert the user's reflections into the prompt template
    const formattedReflections = noteContents.join('\n\n');
    let userPrompt = promptTemplate.replace('[REFLECTIONS]', formattedReflections);
    
    // If we have the user's name, personalize the prompt further
    if (userName) {
      userPrompt = `${userPrompt}\n\nPlease address the user by name: ${userName}`;
    }
    
    console.log(`[Toast Generator] Using '${toastStyle}' toast style`);
    
    // For the structured prompt style, use JSON format approach
    if (validStyle === 'structured') {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are a thoughtful, encouraging speaker crafting personalised toasts. Use warm, motivational, and supportive language." 
          },
          { 
            role: "user", 
            content: `You are writing a toast addressed directly to the user ${userName ? `named ${userName}` : ''}.` +
                     " Use second-person \"you\" and celebrate their recent achievements and reflections." +
                     " Mention specific positive actions or growth moments the user has shared." +
                     " The tone should be heartfelt, sincere, and motivational, about 200 words." +
                     `\n\nHere are the user's reflections:\n${formattedReflections}`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      return response.choices[0].message.content || generateFallbackToastContent(noteContents.length, []);
    } 
    // For regular styles, use the standard approach
    else {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: TOAST_PROMPTS.system },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      return response.choices[0].message.content || generateFallbackToastContent(noteContents.length, []);
    }
  } catch (error) {
    console.error("Error generating toast with OpenAI:", error);
    return generateFallbackToastContent(noteContents.length, []);
  }
}

/**
 * Generate fallback toast content without using OpenAI
 * @param noteCount Number of notes
 * @param themes Array of themes identified in the notes (optional)
 * @returns Generated toast content
 */
function generateFallbackToastContent(noteCount: number, themes: string[] = []): string {
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
 * Generate a weekly toast for a user
 * @param userId ID of the user to generate toast for
 * @param toastStyle Optional style of toast to generate (weekly, uplifting, reflective)
 * @param userName Optional user's name for personalized greeting
 */
export async function generateWeeklyToast(userId: number, toastStyle: string = 'weekly', userName: string = ''): Promise<Toast> {
  // Check if we're in testing mode
  const isTestUser = userId === CONFIG.TEST_USER.id;
  
  // Get date range for weekly toast (using simplified approach for now)
  const { start, end } = getWeeklyDateRange();
  
  // Check if a toast already exists for this period
  const toastExists = await checkToastExists(userId);
  if (toastExists) {
    throw new Error('A toast has already been generated for this week');
  }
  
  let userNotes = [];
  let noteContents = [];
  let noteIds = [];
  
  // Sample data for when no notes are available
  const SAMPLE_NOTES = [
    "Had a productive meeting with the team today.",
    "Completed the project ahead of schedule.",
    "Took time to meditate this morning and felt centered all day.",
    "Connected with an old friend and had a great conversation."
  ];
  const SAMPLE_IDS = [9991, 9992, 9993, 9994];
  
  if (isTestUser) {
    // For test users, use sample data as the fallback
    console.log('[Toast Generator] Test user detected, using sample reflection data');
    noteContents = SAMPLE_NOTES;
    noteIds = SAMPLE_IDS;
  } else {
    // Get real user notes for the date range
    userNotes = await db.select()
      .from(notes)
      .where(and(
        eq(notes.userId, userId),
        between(notes.createdAt, start, end)
      ));
    
    if (userNotes.length === 0) {
      throw new Error('No notes found for this week. Add some reflections first!');
    }
    
    // Extract note contents and IDs
    noteContents = userNotes.map(note => note.content || '').filter(Boolean);
    noteIds = userNotes.map(note => note.id);
  }
  
  // Get user info to personalize the toast with their name
  let userInfo;
  if (!isTestUser) {
    try {
      // Query the database to get the user's name
      const userResult = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResult.length > 0) {
        userInfo = userResult[0];
        console.log(`[Toast Generator] Including user's name: ${userInfo.name}`);
      }
    } catch (error) {
      console.warn(`[Toast Generator] Couldn't fetch user info:`, error);
    }
  }
  
  // Generate toast content with the specified style and user's name if available
  const content = await generateToastContent(
    noteContents, 
    toastStyle, 
    userInfo?.name || userName || ''
  );
  
  // For test users, skip database operations and return mock data
  if (isTestUser) {
    console.log('[Toast Generator] Test user - returning mock toast without DB write');
    return {
      id: 9999,
      userId,
      content,
      audioUrl: null,
      noteIds,
      type: 'weekly',
      intervalStart: start,
      intervalEnd: end,
      createdAt: new Date(),
      shared: false,
      shareUrl: null
    };
  }
  
  // For real users, create toast record without audio first
  const [newToast] = await db.insert(toasts)
    .values({
      userId,
      content,
      noteIds,
    })
    .returning();
  
  try {
    // Default to 'friendly' as the voice style
    let voiceStyle = 'friendly';
    
    // Skip database lookup for test users to avoid foreign key issues
    if (!isTestUser) {
      // Get user voice preferences from database
      const voicePrefs = await db.execute(sql`
        SELECT voice_style 
        FROM voice_preferences 
        WHERE user_id = ${userId}
      `);
      
      console.log('[Toast Generator] Raw voice preference:', 
        voicePrefs.rows.length > 0 ? 
        JSON.stringify(voicePrefs.rows[0]) : 
        'No preferences found');
      
      // Ensure we have a valid string for the voice style
      if (voicePrefs.rows.length > 0 && 
          voicePrefs.rows[0].voice_style && 
          typeof voicePrefs.rows[0].voice_style === 'string' &&
          voicePrefs.rows[0].voice_style.trim() !== '') {
        voiceStyle = voicePrefs.rows[0].voice_style;
      }
    } else {
      console.log('[Toast Generator] Test user - using default voice style');
    }
    
    console.log(`[Toast Generator] Using voice preference: ${voiceStyle}`);
    const voiceId = getVoiceId(voiceStyle);
    
    // Try to generate audio for the toast with our enhanced error handling
    console.log(`[Toast Generator] Generating audio with voice: ${voiceId} for user ${userId}`);
    
    // Pass the userId to enable rate limiting
    const ttsResult = await generateSpeech(content, voiceId, userId);
    
    // Handle various response types from the TTS service
    if (typeof ttsResult === 'string') {
      // Success case - we got a URL to the audio file
      console.log(`[Toast Generator] Audio generated successfully: ${ttsResult}`);
      
      // Update toast with the audio URL
      const [updatedToast] = await db.update(toasts)
        .set({ audioUrl: ttsResult })
        .where(eq(toasts.id, newToast.id))
        .returning();
      
      return updatedToast;
    } 
    else if (ttsResult && typeof ttsResult === 'object' && 'error' in ttsResult) {
      // Error case with specific message
      console.warn(`[Toast Generator] Audio generation error: ${ttsResult.error}`);
      
      // Store the error message in the toast
      const errorMessage = ttsResult.error;
      
      // Provide user-friendly error messages
      let errorPrefix = 'Error: ';
      if (errorMessage.includes('Rate limit')) {
        errorPrefix += 'Rate limit reached. Please try again later.';
      } 
      else if (errorMessage.includes('quota exceeded') || errorMessage.includes('Not enough TTS credits')) {
        errorPrefix += 'Voice generation quota exceeded. Please try again later.';
      }
      else if (errorMessage.includes('timeout')) {
        errorPrefix += 'Voice generation timed out. Please try again later.';
      }
      else {
        errorPrefix += 'Unable to generate audio at this time.';
      }
      
      // Update toast with error status in the audioUrl field
      // This will display the error message in the UI where the audio player would normally be
      const [updatedToast] = await db.update(toasts)
        .set({ 
          audioUrl: errorPrefix
        })
        .where(eq(toasts.id, newToast.id))
        .returning();
      
      return updatedToast;
    } 
    else {
      // Null or unexpected response
      console.log('[Toast Generator] Failed to generate audio');
      
      // Update toast with generic error
      const [updatedToast] = await db.update(toasts)
        .set({ audioUrl: 'Error: Audio generation failed. Please try again later.' })
        .where(eq(toasts.id, newToast.id))
        .returning();
      
      return updatedToast;
    }
  } catch (error) {
    console.error('Error generating audio for toast:', error);
    // Continue with the toast even if audio generation fails
  }
  
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
  let nextToastDate = now.set({ weekday: luxonDay as 1|2|3|4|5|6|7 });
  
  // If today is the preferred day but it's already past a certain time (e.g., 6 PM),
  // or if the next occurrence would be in the past, move to next week
  if (nextToastDate <= now) {
    nextToastDate = nextToastDate.plus({ weeks: 1 });
  }
  
  return nextToastDate.startOf('day').toJSDate();
}