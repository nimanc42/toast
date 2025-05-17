import { DateTime } from 'luxon';
import { db } from '../db';
import { toasts, notes, users } from '@shared/schema';
import { eq, and, between, desc, sql } from 'drizzle-orm';
import { User, Toast } from '@shared/schema';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
 */
export async function checkToastExists(userId: number): Promise<boolean> {
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
          content: `Create a personalized celebratory toast based on these reflection notes from the past week:\n\n${noteContents.join('\n\n')}`
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
    `Here's to a week of reflection and growth! You took time to document ${noteCount} moments this week. Each note represents a step in your journey - keep building on this momentum!`,
    `Celebrating your consistency this week! With ${noteCount} reflections, you're creating a valuable record of your journey. These moments of awareness are powerful tools for growth.`,
    `A toast to your mindfulness! Your ${noteCount} reflections this week show your commitment to self-awareness. These insights will serve you well as you continue forward.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

// Import the speech generation function
import { generateSpeech, getVoiceId } from './elevenlabs';

/**
 * Generate a weekly toast for a user
 */
export async function generateWeeklyToast(userId: number): Promise<Toast> {
  // Get date range for weekly toast (using simplified approach for now)
  const { start, end } = getWeeklyDateRange();
  
  // Check if a toast already exists for this period
  const toastExists = await checkToastExists(userId);
  if (toastExists) {
    throw new Error('A toast has already been generated for this week');
  }
  
  // Get user notes for the date range
  const userNotes = await db.select()
    .from(notes)
    .where(and(
      eq(notes.userId, userId),
      between(notes.createdAt, start, end)
    ));
  
  if (userNotes.length === 0) {
    throw new Error('No notes found for this week. Add some reflections first!');
  }
  
  // Extract note contents and IDs
  const noteContents = userNotes.map(note => note.content || '').filter(Boolean);
  const noteIds = userNotes.map(note => note.id);
  
  // Generate toast content
  const content = await generateToastContent(noteContents);
  
  // Create toast record without audio first
  const [newToast] = await db.insert(toasts)
    .values({
      userId,
      content,
      noteIds,
    })
    .returning();
  
  try {
    // Get user voice preferences from database
    const voicePrefs = await db.execute(sql`
      SELECT voice_style 
      FROM voice_preferences 
      WHERE user_id = ${userId}
    `);
    
    // Default to 'friendly' if no preference exists
    let voiceStyle = 'friendly';
    
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