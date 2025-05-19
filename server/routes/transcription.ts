import { Router, Request, Response } from "express";
import { ensureAuthenticated } from "../auth";
import { transcribeAudio } from "../services/transcription";
import multer from "multer";
import { CONFIG } from "../config";

// Set up multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
});

const router = Router();

/**
 * POST /api/transcribe
 * Transcribes an audio file and returns the text
 */
router.post("/", ensureAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
  try {
    // Check if we have a file
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OpenAI API key for transcription");
      return res.status(500).json({ message: "Transcription service is not available" });
    }

    // Get the file buffer and ensure proper filename with extension
    const audioBuffer = req.file.buffer;
    // Force .webm extension for OpenAI Whisper compatibility
    const originalFilename = "audio-reflection.webm";

    // Use testing mode placeholder if enabled
    if (CONFIG.TESTING_MODE) {
      return res.json({ 
        transcript: "This is a test transcription. The testing mode is enabled." 
      });
    }

    console.log(`Transcribing audio file: ${originalFilename} (${audioBuffer.length} bytes, type: ${req.file.mimetype})`);

    // Transcribe the audio
    const transcript = await transcribeAudio(audioBuffer, originalFilename);

    console.log(`Transcription successful: "${transcript.substring(0, 100)}${transcript.length > 100 ? '...' : ''}"`);

    // Return the transcript
    return res.json({ transcript });
  } catch (error: any) {
    console.error("Error during transcription:", error);
    return res.status(500).json({ 
      message: "Failed to transcribe audio",
      error: error?.message || "Unknown error"
    });
  }
});

export default router;