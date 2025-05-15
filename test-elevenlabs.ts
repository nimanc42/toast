import { generateSpeech, getVoiceId } from './server/services/elevenlabs';

async function testElevenLabs() {
  try {
    console.log('Testing ElevenLabs TTS integration...');
    
    // Test text for speech generation
    const testText = 'This is a test of the ElevenLabs text-to-speech integration. How does this sound?';
    
    // Test with default voice (Rachel)
    console.log('1. Testing with default voice (Rachel)...');
    const defaultAudioUrl = await generateSpeech(testText);
    console.log(`Generated audio URL: ${defaultAudioUrl}`);
    
    // Test with friendly voice (Adam)
    console.log('\n2. Testing with friendly voice (Adam)...');
    const friendlyVoiceId = getVoiceId('friendly');
    const friendlyAudioUrl = await generateSpeech(testText, friendlyVoiceId);
    console.log(`Generated audio URL: ${friendlyAudioUrl}`);
    
    console.log('\nElevenLabs TTS testing completed successfully!');
  } catch (error) {
    console.error('Error testing ElevenLabs TTS:', error);
  }
}

// Run the test
testElevenLabs()
  .then(() => {
    console.log('Test script finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });