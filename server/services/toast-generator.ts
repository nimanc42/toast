import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { storage } from '../storage';
import { uploadAudioToSupabase } from './supabase-storage';

// Initialize OpenAI client
console.log("[OpenAI] API key exists:", !!process.env.OPENAI_API_KEY);
console.log("[OpenAI] API key length:", process.env.OPENAI_API_KEY?.length || 0);
console.log("[OpenAI] API key prefix:", process.env.OPENAI_API_KEY?.substring(0, 7) || "N/A");

// Create the OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Flag to determine if we should use Supabase or local storage
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

/**
 * Ensures the audio directory exists
 * @returns Path to the audio directory
 */
const ensureAudioDirExists = () => {
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  return audioDir;
};

/**
 * Input parameters for toast generation
 */
interface ToastInput {
  userId: number;
  bundleTag?: string | null;
}

/**
 * Generate a weekly toast from a user's notes
 * 
 * @param input The input parameters containing userId and optional bundleTag
 * @returns Object containing the toast text and audio URL
 */
export async function generateWeeklyToast(input: ToastInput | number): Promise<{ content: string, audioUrl: string }> {
  // Handle legacy calls with just userId
  const userId = typeof input === 'number' ? input : input.userId;
  const bundleTag = typeof input === 'number' ? null : input.bundleTag;
  
  // TODO (BundledAway): activate bundle tag feature for memory grouping
  // Log bundle tag only in development mode
  if (process.env.NODE_ENV === 'development' && bundleTag) {
    console.log(`[Toast Generator] Using bundle tag: ${bundleTag}`);
  }
  // 1️⃣ Gather notes from the last 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const notes = await storage.getNotesByUserIdAndDateRange(userId, startDate, endDate);
  if (!notes.length) {
    throw new Error('No notes found for the last week');
  }

  // 2️⃣ Compose prompt with the notes content
  const noteContent = notes.map(n => `• ${n.content}`).join('\n');
  const prompt = `
    Summarize these reflections into a short celebratory toast (2-3 paragraphs).
    Format: positive, second-person ("you"), motivational, no emojis.
    
    Reflections:
    ${noteContent}
  `;

  // 3️⃣ Call OpenAI to generate the toast text
  
  // Check if OpenAI API key is valid
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key. Please provide a valid API key in the environment variables.');
  }
  
  let toastContent: string;
  
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",  // Using the latest model
      messages: [{ role: "user", content: prompt }]
    });
    
    toastContent = completion.choices[0]?.message.content?.trim() || "Your weekly toast is ready.";
  } catch (error: any) {
    console.error("[Toast gen]", error);
    
    // Provide more helpful error messages
    if (error.status === 401) {
      throw new Error('OpenAI API key authentication failed. Please check your API key.');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.status === 500) {
      throw new Error('OpenAI API server error. Please try again later.');
    } else {
      throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
    }
  }

  // Get user's voice preference
  const voicePreference = await storage.getVoicePreferenceByUserId(userId);
  const voiceStyle = voicePreference ? voicePreference.voiceStyle : 'motivational';
  
  console.log(`[Toast Generator] User ${userId} voice preference:`, { 
    fromDb: voicePreference?.voiceStyle || 'none found', 
    usingStyle: voiceStyle 
  });
  
  // Get the ElevenLabs voice ID based on the style
  let voiceId = '';
  let voiceName = '';
  
  switch (voiceStyle) {
    case 'friendly':
      voiceId = '21m00Tcm4TlvDq8ikWAM'; // Adam
      voiceName = 'Adam (Friendly)';
      break;
    case 'poetic':
      voiceId = 'AZnzlk1XvdvUeBnXmlld'; // Domi
      voiceName = 'Domi (Poetic)';
      break;
    case 'motivational':
    default:
      voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Rachel
      voiceName = 'Rachel (Motivational)';
      break;
  }
  
  console.log(`[Toast Generator] Selected voice: ${voiceName} (ID: ${voiceId})`);
  

  // 4️⃣ Call ElevenLabs to convert the toast to speech
  try {
    ensureAudioDirExists();
    
    // Important: Handle missing API key gracefully
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('[TTS] Missing ELEVENLABS_API_KEY');
      throw new Error('ElevenLabs API key is missing. Audio generation not possible.');
    }
    
    // Use Promise.race with a timeout to prevent hanging requests
    const timeoutPromise = new Promise<Response | null>((_, reject) => {
      setTimeout(() => reject(new Error('TTS request timeout after 15 seconds')), 15000);
    });
    
    // Attempt to make the ElevenLabs API call with timeout protection
    let response;
    try {
      response = await Promise.race([
        fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
              "Content-Type": "application/json",
              "Accept": "audio/mpeg"
            },
            body: JSON.stringify({ 
              text: toastContent, 
              voice_settings: { 
                stability: 0.4, 
                similarity_boost: 0.75 
              } 
            })
          }
        ),
        timeoutPromise
      ]);
    } catch (fetchError) {
      console.error('[TTS] Fetch error:', fetchError);
      // Create toast without audio on fetch failure
      const noteIds = notes.map(note => note.id);
      const toast = await storage.createToast({
        userId,
        content: toastContent,
        audioUrl: null,
        noteIds,
        shared: false,
        shareUrl: null
      });
      return { content: toast.content, audioUrl: '' };
    }

    // Handle non-OK response
    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => 'Unable to read error response') : 'No response';
      console.error(`[TTS] ElevenLabs API error: ${response?.status || 'unknown'} - ${errorText}`);
      
      // Create toast without audio
      const noteIds = notes.map(note => note.id);
      const toast = await storage.createToast({
        userId,
        content: toastContent,
        audioUrl: null,
        noteIds,
        shared: false,
        shareUrl: null
      });
      return { content: toast.content, audioUrl: '' };
    }

    // Process response and save audio file with error handling
    try {
      const arrayBuffer = await response.arrayBuffer().catch((err: Error) => {
        console.error('[TTS] Failed to read response buffer:', err);
        return null;
      });
      
      if (!arrayBuffer) {
        throw new Error('Failed to read audio response buffer');
      }
      
      const buffer = Buffer.from(arrayBuffer);
      const timestamp = Date.now();
      const filename = `toast-${userId}-${timestamp}.mp3`;
      
      // Get note IDs for the toast
      const noteIds = notes.map(note => note.id);
      
      let audioUrl: string | null = null;
      
      // Decide whether to use Supabase or local storage
      if (useSupabase) {
        console.log('[TTS] Using Supabase Storage for audio file');
        audioUrl = await uploadAudioToSupabase(buffer, filename);
        
        if (audioUrl) {
          console.log(`[TTS] Audio uploaded to Supabase: ${audioUrl}`);
        } else {
          console.error('[TTS] Failed to upload to Supabase, falling back to local storage');
        }
      }
      
      // Fallback to local storage if Supabase failed or not configured
      if (!audioUrl) {
        console.log('[TTS] Using local storage for audio file');
        const filePath = path.join(process.cwd(), 'public', 'audio', filename);
        ensureAudioDirExists();
        
        // Use async file operations
        try {
          await fs.promises.writeFile(filePath, buffer);
          audioUrl = `/audio/${filename}`;
        } catch (err: any) {
          console.error('[TTS] Failed to write audio file:', err);
          throw err;
        }
      }
      
      // 5️⃣ Create the toast in the database
      const toast = await storage.createToast({
        userId,
        content: toastContent,
        audioUrl,
        noteIds,
        shared: false,
        shareUrl: null
      });

      return { 
        content: toast.content, 
        audioUrl: toast.audioUrl || '' 
      };
    } catch (fileError) {
      console.error('[TTS] File processing error:', fileError);
      // Create toast without audio on file processing error
      const noteIds = notes.map(note => note.id);
      const toast = await storage.createToast({
        userId,
        content: toastContent,
        audioUrl: null,
        noteIds,
        shared: false,
        shareUrl: null
      });
      return { content: toast.content, audioUrl: '' };
    }
  } catch (error: any) {
    console.error('[TTS] Unhandled error in speech generation:', error);
    
    // Get note IDs for the toast
    const noteIds = notes.map(note => note.id);
    
    // Still create a toast in the database, but without an audio URL
    const toast = await storage.createToast({
      userId,
      content: toastContent,
      audioUrl: null,
      noteIds,
      shared: false,
      shareUrl: null
    });
    
    // Instead of throwing, return a valid result but without audio
    return { content: toast.content, audioUrl: '' };
  }
}

/**
 * Generate a weekly toast for all users who have notes in the last week
 * @returns Number of toasts generated
 */
export async function generateWeeklyToastsForAllUsers(): Promise<number> {
  // Get all users
  // This implementation would need to be added to the storage interface
  // const users = await storage.getAllUsers();
  
  // For demo purposes, let's assume we have a way to get all user IDs
  // This would be replaced with actual implementation
  const userIds: number[] = []; // await storage.getAllUserIds();
  
  let successCount = 0;
  
  for (const userId of userIds) {
    try {
      await generateWeeklyToast({ userId });
      successCount++;
    } catch (error) {
      console.error(`Failed to generate toast for user ${userId}:`, error);
    }
  }
  
  return successCount;
}