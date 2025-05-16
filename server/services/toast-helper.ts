import { db } from '../db';
import { toasts, notes, voicePreferences } from '@shared/schema';
import { eq, and, between, sql } from 'drizzle-orm';
import { Toast } from '@shared/schema';
import OpenAI from 'openai';
import { generateSpeech, getVoiceId } from './elevenlabs';

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
export async function generateWeeklyToast(userId: number): Promise<Toast> {
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
    const audioUrl = await generateSpeech(content, voiceId);
    if (audioUrl) {
      // Update toast with audio URL
      const [updatedToast] = await db.update(toasts)
        .set({ audioUrl })
        .where(eq(toasts.id, newToast.id))
        .returning();
      
      return updatedToast;
    }
  } catch (error) {
    console.error('Error generating speech for toast:', error);
  }
  
  return newToast;
}