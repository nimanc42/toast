import { StorageClient } from '@supabase/storage-js';

// Initialize Supabase storage client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const bucketName = process.env.SUPABASE_BUCKET || 'audio';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.');
}

// Create a single instance of the storage client
const storageClient = new StorageClient(supabaseUrl, {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
});

/**
 * Uploads an audio buffer to Supabase Storage
 * @param buffer The audio buffer to upload
 * @param filename The filename to use
 * @returns The public URL of the uploaded file
 */
export async function uploadAudioToSupabase(
  buffer: Buffer, 
  filename: string
): Promise<string | null> {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Check if the bucket exists, create it if not
    try {
      await storageClient.getBucket(bucketName);
    } catch (error) {
      console.log(`Creating bucket ${bucketName}...`);
      await storageClient.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    }

    // Upload the file
    const { data, error } = await storageClient
      .from(bucketName)
      .upload(filename, buffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      return null;
    }

    if (!data?.path) {
      console.error('No data returned from Supabase upload');
      return null;
    }

    // Get the public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${data.path}`;
    return publicUrl;
  } catch (error) {
    console.error('Failed to upload audio to Supabase:', error);
    return null;
  }
}

/**
 * Deletes an audio file from Supabase Storage
 * @param filename The filename to delete
 * @returns Boolean indicating success
 */
export async function deleteAudioFromSupabase(filename: string): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const { error } = await storageClient
      .from(bucketName)
      .remove([filename]);

    if (error) {
      console.error('Error deleting from Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete audio from Supabase:', error);
    return false;
  }
}