import fs from 'fs';
import path from 'path';

export interface VoiceCatalogueEntry {
  id: string;
  name: string;
  description: string;
  sampleUrl: string;
  ttsVoice: string; // OpenAI TTS voice name
}

// CENTRALIZED VOICE MAPPING: These IDs must match elevenlabs.ts exactly
const VOICE_MAPPING: Record<string, { name: string; description: string; ttsVoice: string; elevenLabsId: string }> = {
  'amelia': { name: 'Amelia', description: 'Warm and encouraging', ttsVoice: 'nova', elevenLabsId: 'ZF6FPAbjXT4488VcRRnw' },
  'david-antfield': { name: 'David', description: 'Professional and clear', ttsVoice: 'echo', elevenLabsId: '21m00Tcm4TlvDq8ikWAM' },
  'giovanni': { name: 'Giovanni', description: 'Smooth and confident', ttsVoice: 'onyx', elevenLabsId: 'zcAOhNBS3c14rBihAFp1' },
  'grandpa': { name: 'Grandpa Spuds Oxley', description: 'Wise and comforting', ttsVoice: 'echo', elevenLabsId: 'ErXwobaYiN019PkySvjV' },
  'maeve': { name: 'Maeve', description: 'Gentle and soothing', ttsVoice: 'shimmer', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
  'rachel': { name: 'Rachel', description: 'Friendly and upbeat', ttsVoice: 'alloy', elevenLabsId: '21m00Tcm4TlvDq8ikWAM' },
  'ranger': { name: 'Ranger', description: 'Strong and motivational', ttsVoice: 'onyx', elevenLabsId: 'MF3mGyEYCl7XYWbV9V6O' },
  'sam': { name: 'Sam', description: 'Casual and relatable', ttsVoice: 'nova', elevenLabsId: 'yoZ06aMxZJJ28mfd3POQ' },
};

let voiceCatalogue: VoiceCatalogueEntry[] = [];

/**
 * Scan the voice-samples directory and build the voice catalogue
 */
export function initializeVoiceCatalogue(): void {
  try {
    const voiceSamplesDir = path.join(process.cwd(), 'public', 'voice-samples');
    
    if (!fs.existsSync(voiceSamplesDir)) {
      console.warn('[Voice Catalogue] Voice samples directory not found:', voiceSamplesDir);
      return;
    }

    const files = fs.readdirSync(voiceSamplesDir);
    const mp3Files = files.filter(file => file.endsWith('.mp3'));
    
    voiceCatalogue = mp3Files.map(file => {
      const id = path.basename(file, '.mp3');
      const mapping = VOICE_MAPPING[id];
      
      if (!mapping) {
        console.warn(`[Voice Catalogue] No mapping found for voice sample: ${id}`);
        return {
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          description: 'Custom voice',
          sampleUrl: `/voice-samples/${file}`,
          ttsVoice: 'alloy' // fallback
        };
      }
      
      return {
        id,
        name: mapping.name,
        description: mapping.description,
        sampleUrl: `/voice-samples/${file}`,
        ttsVoice: mapping.ttsVoice
      };
    });

    console.log(`[Voice Catalogue] Initialized with ${voiceCatalogue.length} voices:`, 
      voiceCatalogue.map(v => v.name).join(', '));
      
  } catch (error) {
    console.error('[Voice Catalogue] Error initializing voice catalogue:', error);
    voiceCatalogue = [];
  }
}

/**
 * Get all available voices
 */
export function getAvailableVoices(): VoiceCatalogueEntry[] {
  return voiceCatalogue;
}

/**
 * Get a specific voice by ID
 */
export function getVoiceById(id: string): VoiceCatalogueEntry | undefined {
  return voiceCatalogue.find(voice => voice.id === id);
}

/**
 * Get the TTS voice name for a given voice ID
 */
export function getTTSVoiceForId(id: string): string {
  const voice = getVoiceById(id);
  return voice?.ttsVoice || 'alloy'; // fallback to alloy if not found
}

/**
 * Get the ElevenLabs voice ID for a given voice ID
 */
export function getElevenLabsVoiceId(id: string): string {
  const mapping = VOICE_MAPPING[id];
  if (!mapping?.elevenLabsId) {
    console.error(`[Voice Catalogue] No ElevenLabs mapping found for voice ID: ${id}`);
    console.error(`[Voice Catalogue] Available voices:`, Object.keys(VOICE_MAPPING));
    throw new Error(`No ElevenLabs voice mapping found for voice ID: ${id}`);
  }
  return mapping.elevenLabsId;
}

/**
 * Get the default voice (first available voice)
 */
export function getDefaultVoice(): VoiceCatalogueEntry | undefined {
  return voiceCatalogue[0];
}