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
  const { choices } = await openai.chat.completions.create({
    model: "gpt-4o",  // Using the latest model
    messages: [{ role: "user", content: prompt }]
  });
  
  const toastContent = choices[0].message.content.trim();

  // Get user's voice preference
  const voicePreference = await storage.getVoicePreferenceByUserId(userId);
  const voiceStyle = voicePreference?.voiceStyle || 'motivational';
  
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
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
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
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    // Save the audio file
    const buffer = Buffer.from(await response.arrayBuffer());
    const timestamp = Date.now();
    const filename = `toast-${userId}-${timestamp}.mp3`;
    const filePath = path.join(process.cwd(), 'public', 'audio', filename);
    
    await fs.promises.writeFile(filePath, buffer);

    // 5️⃣ Create the toast in the database
    const toast = await storage.createToast({
      userId,
      content: toastContent,
      audioUrl: `/audio/${filename}`,
      shareCode: timestamp.toString(36),
      shared: false
    });

    return { 
      content: toast.content, 
      audioUrl: toast.audioUrl 
    };
  } catch (error) {
    console.error('Error generating speech:', error);
    
    // Still create a toast in the database, but without an audio URL
    const toast = await storage.createToast({
      userId,
      content: toastContent,
      audioUrl: null,
      shareCode: Date.now().toString(36),
      shared: false
    });
    
    throw new Error(`Successfully generated toast text, but failed to create audio: ${error.message}`);
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