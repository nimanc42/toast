// Simple script to generate remaining voice samples
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI();

async function generateSample(voice) {
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
    const filePath = path.join(process.cwd(), 'public', 'voice-samples', `${voice.id}.mp3`);
    fs.writeFileSync(filePath, buffer);
    
    console.log(`Sample for ${voice.name} saved successfully!`);
    return true;
  } catch (error) {
    console.error(`Error generating ${voice.name} sample:`, error);
    return false;
  }
}

async function main() {
  const voices = [
    { id: 'ranger', name: 'Ranger', ttsVoice: 'onyx' },
    { id: 'grandpa', name: 'Grandpa', ttsVoice: 'echo' },
    { id: 'custom', name: 'Custom Voice', ttsVoice: 'alloy' },
  ];
  
  for (const voice of voices) {
    await generateSample(voice);
  }
  
  console.log('All voice samples generated!');
}

main().catch(console.error);