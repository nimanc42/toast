import { db } from '../db';
import { toasts, notes, voicePreferences } from '@shared/schema';
import { eq, and, between, sql } from 'drizzle-orm';
import { Toast } from '@shared/schema';
import OpenAI from 'openai';
import { generateSpeech, getVoiceId } from './elevenlabs';
import { CONFIG } from '../config';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

/**
 * Get the user's preferred voice style
 */
async function getUserVoiceStyle(userId: number): Promise<string> {
  try {
    const userPrefs = await db.select()
      .from(voicePreferences)
      .where(eq(voicePreferences.userId, userId));
    
    return userPrefs.length > 0 && userPrefs[0].voiceStyle 
      ? userPrefs[0].voiceStyle 
      : 'friendly';
  } catch (error) {
    console.error('Error getting user voice style:', error);
    return 'friendly';
  }
}

/**
 * Generate a weekly toast for a user
 */
export async function generateWeeklyToast(userId: number, isTestingMode: boolean = false): Promise<Toast> {
  // When in testing mode and TESTING_MODE config is enabled, bypass all restrictions
  if (isTestingMode || CONFIG.TESTING_MODE) {
    console.log('[Toast Helper] Running in testing mode - bypassing normal restrictions');
    
    // Create mock data for testing
    const mockToastContent = `
      Here's a toast to your amazing week! You've been recording thoughtful reflections that show 
      your commitment to personal growth. I noticed your consistency in journaling and your focus 
      on gratitude. You're making progress on your goals while maintaining balance. 
      Keep up the great work - you're on an impressive journey of self-improvement!
    `;
    
    // Generate a random ID for the test toast
    const toastId = Math.floor(Math.random() * 10000);
    
    // For testing, generate real audio but don't save to database
    const voiceId = getVoiceId('friendly');
    let audioUrl: string | null = null;
    
    try {
      // Even in testing mode, we'll generate real audio for proper testing
      audioUrl = await generateSpeech(mockToastContent, voiceId, userId) as string;
    } catch (error) {
      console.warn('[Testing Mode] Audio generation skipped:', error);
      audioUrl = "Testing-mode-audio-url";
    }
    
    return {
      id: toastId,
      userId,
      content: mockToastContent,
      audioUrl,
      noteIds: [9001, 9002, 9003], // mock note IDs
      type: 'weekly',
      intervalStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      intervalEnd: new Date(),
      createdAt: new Date(),
      shared: false,
      shareUrl: null
    };
  }

  // Normal production mode flow
  // Date range for the past week
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);
  
  // Get user notes for the past week
  const userNotes = await db.select()
    .from(notes)
    .where(and(
      eq(notes.userId, userId),
      between(notes.createdAt, startDate, endDate)
    ));
  
  if (userNotes.length === 0) {
    throw new Error('No notes found for this week. Add some reflections first!');
  }
  
  // Extract note contents and IDs
  const noteContents = userNotes.map(note => note.content || '').filter(Boolean);
  const noteIds = userNotes.map(note => note.id);
  
  // Generate toast content
  const content = await generateToastContent(noteContents);
  
  // Get user's voice preference
  const voiceStyle = await getUserVoiceStyle(userId);
  const voiceId = getVoiceId(voiceStyle);
  
  // Create toast record
  const [newToast] = await db.insert(toasts)
    .values({
      userId,
      content,
      noteIds,
    })
    .returning();
  
  // Generate audio for the toast
  try {
    // Pass userId to enable rate limiting
    const ttsResult = await generateSpeech(content, voiceId, userId);
    
    // Handle various response types
    let finalAudioUrl: string | null = null;
    
    console.log(`[Toast Helper] TTS result type: ${typeof ttsResult}`, ttsResult);
    
    if (typeof ttsResult === 'string') {
      // Success case - got a valid URL
      finalAudioUrl = ttsResult;
    }
    else if (ttsResult && typeof ttsResult === 'object' && 'error' in ttsResult) {
      // Error case - use the error message in the audio URL field
      finalAudioUrl = `Error: ${ttsResult.error}`;
      console.warn(`[Toast Helper] Audio generation error: ${ttsResult.error}`);
    }
    
    if (finalAudioUrl) {
      // Update toast with audio URL
      const [updatedToast] = await db.update(toasts)
        .set({ audioUrl: finalAudioUrl })
        .where(eq(toasts.id, newToast.id))
        .returning();
      
      return updatedToast;
    }
  } catch (error) {
    console.error('Error generating speech for toast:', error);
  }
  
  return newToast;
}