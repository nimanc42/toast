import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the voice samples to generate
const voices = [
  { id: 'motivational', name: 'Motivational Coach', ttsVoice: 'nova' },
  { id: 'friendly', name: 'Friendly', ttsVoice: 'alloy' },
  { id: 'poetic', name: 'Poetic', ttsVoice: 'shimmer' },
  { id: 'david', name: 'David', ttsVoice: 'echo' },
  { id: 'ranger', name: 'Ranger', ttsVoice: 'onyx' },
  { id: 'grandpa', name: 'Grandpa', ttsVoice: 'echo' },
  { id: 'custom', name: 'Custom Voice', ttsVoice: 'alloy' },
];

// Ensure the output directory exists
const outputDir = path.join(process.cwd(), 'public', 'voice-samples');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateVoiceSample(voice: { id: string; name: string; ttsVoice: string }) {
  console.log(`Generating sample for ${voice.name}...`);
  
  // Create the text for the voice sample
  const text = `Hi! This is the ${voice.name} you can choose for your weekly toast.`;
  
  try {
    // Use OpenAI TTS to generate the audio
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice.ttsVoice,
      input: text,
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    
    // Save the buffer to file
    const filePath = path.join(outputDir, `${voice.id}.mp3`);
    fs.writeFileSync(filePath, buffer);
    
    console.log(`Sample for ${voice.name} saved to ${filePath}`);
  } catch (error) {
    console.error(`Error generating ${voice.name} sample:`, error);
  }
}

async function generateAllSamples() {
  console.log('Starting voice sample generation...');
  
  // Generate each voice sample
  for (const voice of voices) {
    await generateVoiceSample(voice);
  }
  
  console.log('All voice samples generated successfully!');
}

// Run the script
generateAllSamples().catch(console.error);