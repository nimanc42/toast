import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Readable } from 'stream';

// Default voice settings
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Rachel voice
const DEFAULT_STABILITY = 0.5;
const DEFAULT_SIMILARITY_BOOST = 0.75;

// Ensure audio directory exists
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
export async function generateSpeech(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<string> {
  // Ensure we have an API key
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  try {
    // Prepare request to ElevenLabs API
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(url, {
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

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    // Generate a unique filename for the audio
    const timestamp = Date.now();
    const filename = `toast-${timestamp}.mp3`;
    
    // Ensure directory exists
    const audioDir = ensureAudioDirExists();
    const filePath = path.join(audioDir, filename);
    
    // Save the audio file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    
    // Return the URL to the audio file
    return `/audio/${filename}`;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
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
    'poetic': 'AZnzlk1XvdvUeBnXmlld'        // Domi
  };
  
  return voiceMap[voiceStyle] || DEFAULT_VOICE_ID;
}