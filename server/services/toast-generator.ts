import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { storage } from '../storage';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
 * Generate a weekly toast from a user's notes
 * 
 * @param userId The user ID
 * @returns Object containing the toast text and audio URL
 */
export async function generateWeeklyToast(userId: number): Promise<{ content: string, audioUrl: string }> {
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
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",  // Using the latest model
    messages: [{ role: "user", content: prompt }]
  });
  
  const toastContent = completion.choices[0]?.message.content?.trim() || "Your weekly toast is ready.";

  // Get user's voice preference
  const voicePreference = await storage.getVoicePreferenceByUserId(userId);
  const voiceStyle = voicePreference ? voicePreference.voiceStyle : 'motivational';
  
  // Get the ElevenLabs voice ID based on the style
  let voiceId = '';
  switch (voiceStyle) {
    case 'friendly':
      voiceId = '21m00Tcm4TlvDq8ikWAM'; // Adam
      break;
    case 'poetic':
      voiceId = 'AZnzlk1XvdvUeBnXmlld'; // Domi
      break;
    case 'motivational':
    default:
      voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Rachel
      break;
  }

  // 4️⃣ Call ElevenLabs to convert the toast to speech
  try {
    ensureAudioDirExists();
    
    // Important: Handle missing API key gracefully
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('[TTS] Missing ELEVENLABS_API_KEY');
      // Fall back to creating toast without audio
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
              "xi-api-key": process.env.ELEVENLABS_API_KEY,
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
      const arrayBuffer = await response.arrayBuffer().catch(err => {
        console.error('[TTS] Failed to read response buffer:', err);
        return null;
      });
      
      if (!arrayBuffer) {
        throw new Error('Failed to read audio response buffer');
      }
      
      const buffer = Buffer.from(arrayBuffer);
      const timestamp = Date.now();
      const filename = `toast-${userId}-${timestamp}.mp3`;
      const filePath = path.join(process.cwd(), 'public', 'audio', filename);
      
      // Use async file operations
      await fs.promises.writeFile(filePath, buffer).catch(err => {
        console.error('[TTS] Failed to write audio file:', err);
        throw err;
      });

      // Get note IDs for the toast
      const noteIds = notes.map(note => note.id);
      
      // 5️⃣ Create the toast in the database
      const toast = await storage.createToast({
        userId,
        content: toastContent,
        audioUrl: `/audio/${filename}`,
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
      await generateWeeklyToast(userId);
      successCount++;
    } catch (error) {
      console.error(`Failed to generate toast for user ${userId}:`, error);
    }
  }
  
  return successCount;
}