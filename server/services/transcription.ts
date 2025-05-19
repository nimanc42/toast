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
    // Write the buffer to a temporary file
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Create a readable stream for the file
    const fileStream = fs.createReadStream(tempFilePath);
    
    // Use OpenAI's Whisper model to transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
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