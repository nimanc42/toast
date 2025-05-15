import fs from 'fs';
import path from 'path';
import { uploadAudioToSupabase } from './server/services/supabase-storage';

/**
 * Test function to verify Supabase Storage integration
 */
async function testSupabaseStorage() {
  try {
    console.log('Testing Supabase Storage integration...');
    
    // Check if environment variables are set
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const bucketName = (process.env.SUPABASE_BUCKET || 'audio').toLowerCase();
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration. Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.');
      process.exit(1);
    }
    
    console.log(`Using Supabase URL: ${supabaseUrl}`);
    console.log(`Using bucket: ${bucketName}`);
    
    // Create a simple test file
    const testFilePath = path.join(process.cwd(), 'test-audio.mp3');
    
    // Check if we need to create a test file
    if (!fs.existsSync(testFilePath)) {
      console.log('Creating a test audio file...');
      // Create a simple file with some content
      const dummyBuffer = Buffer.alloc(1024, 'a');
      fs.writeFileSync(testFilePath, dummyBuffer);
    }
    
    // Read the test file
    const fileBuffer = fs.readFileSync(testFilePath);
    const filename = `test-upload-${Date.now()}.mp3`;
    
    console.log(`Uploading test file: ${filename}`);
    
    // Upload to Supabase
    const uploadUrl = await uploadAudioToSupabase(fileBuffer, filename);
    
    if (uploadUrl) {
      console.log('✅ SUCCESS! File uploaded to Supabase Storage.');
      console.log(`File URL: ${uploadUrl}`);
    } else {
      console.error('❌ FAILED! Could not upload file to Supabase Storage.');
    }
    
    // Clean up the test file
    fs.unlinkSync(testFilePath);
    console.log('Test file cleaned up');
    
  } catch (error) {
    console.error('Error testing Supabase Storage:', error);
  }
}

// Run the test
testSupabaseStorage()
  .then(() => {
    console.log('Test script finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });