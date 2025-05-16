import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Readable } from 'stream';
import { uploadAudioToSupabase } from './supabase-storage';

// Default voice settings
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Rachel voice
const DEFAULT_STABILITY = 0.5;
const DEFAULT_SIMILARITY_BOOST = 0.75;

// Flag to determine if we should use Supabase or local storage
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

// Ensure audio directory exists (for fallback to local storage)
const ensureAudioDirExists = () => {
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  return audioDir;
};

/**
 * Generate audio from text using ElevenLabs API
 * @param text The text to convert to speech
 * @param voiceId Optional voice ID to use (defaults to Rachel)
 * @returns The URL to the generated audio file
 */
export async function generateSpeech(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<string | null> {
  // Ensure we have an API key
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY is not set');
    return null;
  }

  try {
    // Prepare request to ElevenLabs API
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    // Use Promise.race with a timeout to prevent hanging requests
    const timeoutPromise = new Promise<Response | null>((_, reject) => {
      setTimeout(() => reject(new Error('TTS request timeout after 10 seconds')), 10000);
    });
    
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: DEFAULT_STABILITY,
            similarity_boost: DEFAULT_SIMILARITY_BOOST
          }
        })
      }),
      timeoutPromise
    ]).catch(err => {
      console.error('[TTS] Fetch error or timeout:', err);
      return null;
    });

    // Handle failed fetch (like network errors)
    if (!response) {
      console.error('[TTS] Fetch failed, null response');
      return null;
    }

    if (!response.ok) {
      const errorData = await response.text().catch(() => 'Unable to read error response');
      console.error(`[TTS] ElevenLabs API error: ${response.status} ${response.statusText} - ${errorData}`);
      return null;
    }

    try {
      // Generate a unique filename for the audio
      const timestamp = Date.now();
      const filename = `toast-${timestamp}.mp3`;
      
      const arrayBuffer = await response.arrayBuffer().catch(err => {
        console.error('[TTS] Failed to read response buffer:', err);
        return null;
      });
      
      if (!arrayBuffer) return null;
      
      const buffer = Buffer.from(arrayBuffer);
      
      // Decide whether to use Supabase or local storage
      if (useSupabase) {
        console.log('[TTS] Using Supabase Storage for audio file');
        const supabaseUrl = await uploadAudioToSupabase(buffer, filename);
        
        if (supabaseUrl) {
          console.log(`[TTS] Audio uploaded to Supabase: ${supabaseUrl}`);
          return supabaseUrl;
        } else {
          console.error('[TTS] Failed to upload to Supabase, falling back to local storage');
        }
      }
      
      // Fallback to local storage if Supabase failed or not configured
      console.log('[TTS] Using local storage for audio file');
      const audioDir = ensureAudioDirExists();
      const filePath = path.join(audioDir, filename);
      
      // Use promises for async file operations
      await fs.promises.writeFile(filePath, buffer).catch(err => {
        console.error('[TTS] Failed to write audio file:', err);
        throw err;
      });
      
      // Return the URL to the audio file
      return `/audio/${filename}`;
    } catch (fileError) {
      console.error('[TTS] File operation error:', fileError);
      return null;
    }
  } catch (error) {
    console.error('[TTS] ElevenLabs error:', error);
    return null;
  }
}

/**
 * Map voice style names to ElevenLabs voice IDs
 * @param voiceStyle The voice style name (e.g., "motivational", "friendly", "poetic")
 * @returns The corresponding ElevenLabs voice ID
 */
export function getVoiceId(voiceStyle: string): string {
  const voiceMap: Record<string, string> = {
    'motivational': 'EXAVITQu4vr4xnSDxMaL', // Rachel
    'friendly': '21m00Tcm4TlvDq8ikWAM',     // Adam
    'poetic': 'AZnzlk1XvdvUeBnXmlld',       // Domi
    'custom': 'Dnd9VXpAjEGXiRGBf1O6'        // Custom voice added by user
  };
  
  return voiceMap[voiceStyle] || DEFAULT_VOICE_ID;
}