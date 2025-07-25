import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Readable } from 'stream';
import { uploadAudioToSupabase } from './supabase-storage';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * OpenAI TTS fallback when ElevenLabs credits are exhausted
 */
async function generateOpenAITTS(
  text: string, 
  elevenLabsVoiceId: string,
  userId?: number
): Promise<string | { error: string } | null> {
  try {
    console.log('[TTS] Using OpenAI TTS as fallback');

    // Map ElevenLabs voice IDs to OpenAI voices - Updated mapping
    const voiceMapping: { [key: string]: string } = {
      '21m00Tcm4TlvDq8ikWAM': 'alloy',     // Rachel -> Alloy
      'ZF6FPAbjXT4488VcRRnw': 'nova',      // Amelia -> Nova
      'jvcMcno3QtjOzGtfpjoI': 'echo',      // David -> Echo
      'zcAOhNBS3c14rBihAFp1': 'onyx',      // Giovanni -> Onyx
      'NOpBlnGInO9m6vDvFkFC': 'echo',      // Grandpa -> Echo
      'XB0fDUnXU5powFXDhCwa': 'shimmer',   // Maeve -> Shimmer
      'MF3mGyEYCl7XYWbV9V6O': 'onyx',      // Ranger -> Onyx
      'yoZ06aMxZJJ28mfd3POQ': 'nova',      // Sam -> Nova
    };

    const openaiVoice = voiceMapping[elevenLabsVoiceId] || 'alloy';

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: openaiVoice as any,
      input: text,
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const filename = `openai-tts-${Date.now()}.mp3`;

    // Upload to Supabase Storage
    const uploadResult = await uploadAudioToSupabase(buffer, filename);

    if (uploadResult) {
      console.log(`[TTS] OpenAI TTS generated successfully: ${uploadResult}`);
      return uploadResult;
    } else {
      console.error('[TTS] Failed to upload OpenAI TTS to storage');
      return { error: 'Failed to upload generated audio' };
    }
  } catch (error) {
    console.error('[TTS] OpenAI TTS generation failed:', error);
    return { error: 'OpenAI TTS generation failed' };
  }
}

// Default voice settings - MUST match voice-catalogue.ts
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice (corrected)
const DEFAULT_STABILITY = 0.5;
const DEFAULT_SIMILARITY_BOOST = 0.75;

// Rate limiting settings (per user)
const MAX_REQUESTS_PER_HOUR = process.env.NODE_ENV === 'development' ? 50 : 10;
const QUOTA_WARNING_THRESHOLD = 2000; // Show warning when less than this many credits remaining

// Flag to determine if we should use Supabase or local storage
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

// In-memory rate limiting storage
// In a production environment, this should be in Redis or another distributed store
type RateLimitEntry = {
  userId: number;
  requestCount: number;
  resetTime: number; // Timestamp when the count resets
};

const userRateLimits = new Map<number, RateLimitEntry>();

/**
 * Check if user has exceeded their rate limit
 * @param userId The user ID to check
 * @returns Object with isLimited flag and resetTime if limited
 */
function checkRateLimit(userId: number): { isLimited: boolean; resetTime?: Date } {
  const now = Date.now();
  const entry = userRateLimits.get(userId);

  if (!entry) {
    // First request, create new entry
    userRateLimits.set(userId, {
      userId,
      requestCount: 1,
      resetTime: now + 3600000 // 1 hour from now
    });
    return { isLimited: false };
  }

  // Check if the reset time has passed
  if (now > entry.resetTime) {
    // Reset period has elapsed, reset counter
    userRateLimits.set(userId, {
      userId,
      requestCount: 1,
      resetTime: now + 3600000 // 1 hour from now
    });
    return { isLimited: false };
  }

  // Check if user has exceeded limit
  if (entry.requestCount >= MAX_REQUESTS_PER_HOUR) {
    return { 
      isLimited: true, 
      resetTime: new Date(entry.resetTime) 
    };
  }

  // Increment request count
  entry.requestCount += 1;
  userRateLimits.set(userId, entry);
  return { isLimited: false };
}

// Ensure audio directory exists (for fallback to local storage)
const ensureAudioDirExists = () => {
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  return audioDir;
};

/**
 * Check ElevenLabs account credit balance
 * @returns Object with user's credit information or null if error
 */
export async function checkElevenLabsCredits(): Promise<{
  remaining: number,
  limit: number,
  status: 'low' | 'ok' | 'error'
} | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('[TTS] ELEVENLABS_API_KEY is not set');
    return null;
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[TTS] Error checking credit balance: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    // Type guard to ensure data has the expected structure
    if (typeof data === 'object' && data !== null && 
        'subscription' in data && typeof data.subscription === 'object' && data.subscription !== null &&
        'character_count' in data.subscription && 'character_limit' in data.subscription) {
      const used = data.subscription.character_count as number;
      const limit = data.subscription.character_limit as number;
      const remaining = limit - used;

      // Determine credit status
      let status: 'low' | 'ok' | 'error' = 'ok';
      if (remaining < QUOTA_WARNING_THRESHOLD) {
        status = 'low';
        console.warn(`[TTS] ElevenLabs credits low: ${remaining} characters remaining`);
      }

      return {
        remaining,
        limit,
        status
      };
    }

    console.error('[TTS] Unexpected response structure from ElevenLabs API');
    return null;
  } catch (error) {
    console.error('[TTS] Error checking ElevenLabs credit balance:', error);
    return null;
  }
}

/**
 * Generate audio from text using ElevenLabs API
 * @param text The text to convert to speech
 * @param voiceId Optional voice ID to use (defaults to Rachel)
 * @param userId User ID for rate limiting purposes
 * @returns The URL to the generated audio file or an error object
 */
export async function generateSpeech(
  text: string, 
  voiceId: string = DEFAULT_VOICE_ID,
  userId?: number
): Promise<string | { error: string, resetTime?: Date } | null> {
  // Ensure we have an API key
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('[TTS] ELEVENLABS_API_KEY is not set');
    return { error: 'TTS service not configured' };
  }

  // Check rate limit if userId is provided
  if (userId) {
    const rateLimit = checkRateLimit(userId);
    if (rateLimit.isLimited) {
      console.warn(`[TTS] Rate limit exceeded for user ${userId}`);
      return { 
        error: 'Rate limit exceeded. Please try again later.', 
        resetTime: rateLimit.resetTime 
      };
    }
  }

  // Check credit balance
  const credits = await checkElevenLabsCredits();
  if (credits && credits.status === 'low') {
    console.warn(`[TTS] Credit balance low: ${credits.remaining} characters remaining`);
    // We continue with the request, but log the warning
  }

  // Estimate character count needed
  const estimatedChars = text.length;
  if (credits && credits.remaining < estimatedChars) {
    console.warn(`[TTS] Not enough ElevenLabs credits: ${estimatedChars} needed, ${credits.remaining} available`);
    console.log('[TTS] Falling back to OpenAI TTS');
    return await generateOpenAITTS(text, voiceId, userId);
  }

  try {
    // Prepare request to ElevenLabs API
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    console.log(`[TTS] Starting request to ElevenLabs API with voice: ${voiceId}`);
    // Use Promise.race with a longer timeout to prevent hanging requests
    const timeoutPromise = new Promise<Response | null>((_, reject) => {
      setTimeout(() => reject(new Error('TTS request timeout after 30 seconds')), 30000);
    });

    const fetchPromise = fetch(url, {
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
    });

    console.log(`[TTS] Request body: ${JSON.stringify({
      text: text.substring(0, 50) + '...',
      voice_settings: {
        stability: DEFAULT_STABILITY,
        similarity_boost: DEFAULT_SIMILARITY_BOOST
      }
    })}`);

    const response = await Promise.race([
      fetchPromise,
      timeoutPromise
    ]).catch(err => {
      console.error('[TTS] Fetch error or timeout:', err);
      return null;
    });

    // Handle failed fetch (like network errors)
    if (!response) {
      console.error('[TTS] Fetch failed, null response');
      return { error: 'Failed to connect to TTS service. Please try again later.' };
    }

    if (!response.ok) {
      try {
        const errorText = await response.text();
        let errorData;

        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { detail: errorText };
        }

        console.error(`[TTS] ElevenLabs API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);

        // Handle specific error scenarios
        if (response.status === 401) {
          if (errorData?.detail?.status === 'quota_exceeded') {
            const message = errorData?.detail?.message || 'Usage quota exceeded';
            console.error(`[TTS] Quota exceeded: ${message}`);
            return { error: 'Voice generation quota exceeded. Please try again later.' };
          }
          return { error: 'TTS service authentication failed' };
        }

        if (response.status === 429) {
          return { error: 'Too many requests. Please try again later.' };
        }

        // Generic error handling
        return { error: `TTS service error: ${response.status} ${response.statusText}` };
      } catch (parseError) {
        console.error('[TTS] Error parsing error response:', parseError);
        return { error: 'Failed to process TTS service response' };
      }
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
        // ensure we store as .mp3 and set correct mime in Supabase
        const uploadRes = await uploadAudioToSupabase(buffer, filename, { contentType: 'audio/mpeg', upsert: true });

        if (uploadRes) {
          console.log(`[TTS] Audio uploaded to Supabase: ${uploadRes}`);
          return uploadRes;
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
  // CENTRALIZED MAPPING: Must match voice-catalogue.ts exactly
  const voiceMap: Record<string, string> = {
    // Primary voice mappings - must match voice-catalogue.ts exactly
    'amelia': 'ZF6FPAbjXT4488VcRRnw',
    'david-antfield': 'jvcMcno3QtjOzGtfpjoI', // Correct David voice ID
    'giovanni': 'zcAOhNBS3c14rBihAFp1',
    'grandpa': 'NOpBlnGInO9m6vDvFkFC',
    'maeve': 'XB0fDUnXU5powFXDhCwa',
    'rachel': '21m00Tcm4TlvDq8ikWAM',
    'ranger': 'MF3mGyEYCl7XYWbV9V6O',
    'sam': 'yoZ06aMxZJJ28mfd3POQ',

    // Legacy aliases for backward compatibility  
    'david': 'jvcMcno3QtjOzGtfpjoI',        // Correct David voice ID
    'motivational': '21m00Tcm4TlvDq8ikWAM', // Rachel
    'friendly': '21m00Tcm4TlvDq8ikWAM',     // Rachel  
    'poetic': 'zcAOhNBS3c14rBihAFp1',       // Giovanni
    'custom': '21m00Tcm4TlvDq8ikWAM'        // Rachel fallback
  };

  console.log(`[TTS] Getting voice ID for style: ${voiceStyle}`);
  
  if (!voiceMap[voiceStyle]) {
    console.error(`[TTS] No voice mapping found for: ${voiceStyle}`);
    console.error(`[TTS] Available voices:`, Object.keys(voiceMap));
    throw new Error(`No voice mapping found for voice style: ${voiceStyle}`);
  }
  
  const voiceId = voiceMap[voiceStyle];
  console.log(`[TTS] Selected voice ID: ${voiceId}`);

  return voiceId;
}

/**
 * Get the ElevenLabs voice ID for a given voice ID
 * Uses the centralized mapping system
 */
export function getElevenLabsVoiceId(id: string): string {
  try {
    return getVoiceId(id);
  } catch (error) {
    console.error(`[TTS] Failed to get ElevenLabs voice ID for "${id}":`, error);
    // Fallback to Rachel instead of Sarah/Grandpa
    return DEFAULT_VOICE_ID;
  }
}