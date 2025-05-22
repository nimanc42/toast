/**
 * Voice sample helper - provides base64-encoded MP3 samples for voice previews
 * 
 * This allows us to have simple audio previews that work without having to make API calls
 * to ElevenLabs or OpenAI for every preview.
 */

// Base64-encoded MP3 samples for each voice
export const voiceSamples: Record<string, string> = {
  // For a real implementation, these would be replaced with actual encoded MP3 samples,
  // but for this demonstration, we'll use an extremely minimal MP3 frame
  
  // Minimal valid MP3 file (essentially empty but recognized as MP3)
  motivational: "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAABAAACCACD//////////////////////////////////////////8AAAA8TEFNRTMuMTAwBK8AAAAAAAAAABSAJAHEQgAAgAAACAhQDUxJAAAAAAAAAAAAAAAAAAAA",
  
  friendly: "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAABAAACCACD//////////////////////////////////////////8AAAA8TEFNRTMuMTAwBK8AAAAAAAAAABSAJAHEQgAAgAAACAhQDUxJAAAAAAAAAAAAAAAAAAAA",
  
  poetic: "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAABAAACCACD//////////////////////////////////////////8AAAA8TEFNRTMuMTAwBK8AAAAAAAAAABSAJAHEQgAAgAAACAhQDUxJAAAAAAAAAAAAAAAAAAAA",
  
  david: "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAABAAACCACD//////////////////////////////////////////8AAAA8TEFNRTMuMTAwBK8AAAAAAAAAABSAJAHEQgAAgAAACAhQDUxJAAAAAAAAAAAAAAAAAAAA",
  
  ranger: "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAABAAACCACD//////////////////////////////////////////8AAAA8TEFNRTMuMTAwBK8AAAAAAAAAABSAJAHEQgAAgAAACAhQDUxJAAAAAAAAAAAAAAAAAAAA",
  
  grandpa: "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAABAAACCACD//////////////////////////////////////////8AAAA8TEFNRTMuMTAwBK8AAAAAAAAAABSAJAHEQgAAgAAACAhQDUxJAAAAAAAAAAAAAAAAAAAA"
};

/**
 * Gets a data URL for a voice sample
 * @param voiceId The ID of the voice to get a sample for
 * @returns A data URL for the voice sample or null if not found
 */
export function getVoiceSampleUrl(voiceId: string): string | null {
  const sample = voiceSamples[voiceId];
  if (!sample) {
    return null;
  }
  
  return `data:audio/mp3;base64,${sample}`;
}