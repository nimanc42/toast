import OpenAI from "openai";
import { CONFIG } from "../config";
import fs from "fs";
import os from "os";
import path from "path";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Transcribe an audio file using OpenAI Whisper
 * 
 * @param audioBuffer The audio file buffer to transcribe
 * @param fileName Original file name (for extension/format detection)
 * @returns The transcription text
 */
export async function transcribeAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
  // Create a temporary file to store the audio
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, fileName);
  
  try {
    // Write the buffer to a temporary file with .webm extension to ensure proper format detection
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    console.log(`Saved audio file to ${tempFilePath}, size: ${audioBuffer.length} bytes`);
    
    // Create a File object that Whisper can process directly
    const file = fs.createReadStream(tempFilePath);
    
    // Use OpenAI's Whisper model to transcribe the audio
    // The key is passing the file stream directly without manipulating it
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1", // Use the Whisper model for transcription
      language: "en", // Set to English language
      response_format: "text" // Get plain text response
    });
    
    // Return the transcribed text (transcription is a string in text response format)
    return transcription || "[Unable to transcribe audio]";
  } catch (error: any) {
    console.error("Transcription error:", error);
    throw new Error(`Failed to transcribe audio: ${error?.message || 'Unknown error'}`);
  } finally {
    // Clean up the temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}