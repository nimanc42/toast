import { StorageClient } from '@supabase/storage-js';

// Initialize Supabase storage client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'audio';
let storageClient: StorageClient | null = null;

// Only initialize storage client if all required variables are available
if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase configuration. Audio storage in Supabase will be unavailable. Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set if you want to use Supabase storage.');
} else {
  // Create a single instance of the storage client
  // Initialize with the correct URL format
  const storageUrl = supabaseUrl.endsWith('/') 
    ? `${supabaseUrl}storage/v1` 
    : `${supabaseUrl}/storage/v1`;

  storageClient = new StorageClient(storageUrl, {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  });
}

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
    if (!storageClient || !supabaseUrl || !supabaseKey) {
      console.warn('Supabase storage not configured. Using fallback storage method.');
      return null;
    }

    console.log(`Attempting to upload to bucket: ${bucketName}`);
    
    // Ensure the bucket name is lowercase (Supabase requirement)
    const sanitizedBucketName = bucketName.toLowerCase();
    
    // Check if the bucket exists, create it if not
    try {
      await storageClient.getBucket(sanitizedBucketName);
      console.log(`Bucket ${sanitizedBucketName} exists`);
    } catch (error) {
      console.log(`Creating bucket ${sanitizedBucketName}...`);
      try {
        await storageClient.createBucket(sanitizedBucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        console.log(`Bucket ${sanitizedBucketName} created successfully`);
      } catch (bucketError: any) {
        console.error(`Failed to create bucket: ${bucketError?.message || bucketError}`);
        // If we can't create the bucket, we might not have the right permissions
        // Just continue and try to upload anyway
      }
    }

    // Upload the file
    console.log(`Uploading file: ${filename}`);
    const { data, error } = await storageClient
      .from(sanitizedBucketName)
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

    console.log(`File uploaded successfully: ${data.path}`);

    // Get the public URL - ensure we use the correct format
    // Fix double-slash issue
    const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const publicUrl = `${baseUrl}/storage/v1/object/public/${sanitizedBucketName}/${data.path}`;
    console.log(`Public URL: ${publicUrl}`);
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
    if (!storageClient || !supabaseUrl || !supabaseKey) {
      console.warn('Supabase storage not configured. Cannot delete file.');
      return false;
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