import { StorageClient } from '@supabase/storage-js';

/**
 * Script to manually create a bucket in Supabase Storage
 */
async function createBucket() {
  // Get environment variables
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
  const bucketName = (process.env.SUPABASE_BUCKET || 'audio').toLowerCase();

  console.log(`Creating bucket "${bucketName}" in Supabase Storage...`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration. Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.');
    process.exit(1);
  }

  // Initialize with the correct URL format
  const storageUrl = supabaseUrl.endsWith('/') 
    ? `${supabaseUrl}storage/v1` 
    : `${supabaseUrl}/storage/v1`;

  console.log(`Using storage URL: ${storageUrl}`);

  const storageClient = new StorageClient(storageUrl, {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  });

  try {
    // Try to get the bucket first
    try {
      const { data: bucketData } = await storageClient.listBuckets();
      console.log('Existing buckets:', bucketData.map(bucket => bucket.name).join(', '));
      
      const bucketExists = bucketData.some(bucket => bucket.name === bucketName);
      
      if (bucketExists) {
        console.log(`Bucket "${bucketName}" already exists.`);
        return;
      }
    } catch (error) {
      console.error('Error listing buckets:', error);
      // Continue to try creating the bucket
    }

    // Create the bucket
    const { data, error } = await storageClient.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });

    if (error) {
      console.error('Failed to create bucket:', error);
      process.exit(1);
    }

    console.log(`✅ Bucket "${bucketName}" created successfully!`);
    console.log('Bucket data:', data);
    
    // Update bucket permissions to make it public
    const { error: updateError } = await storageClient.updateBucket(bucketName, {
      public: true,
    });

    if (updateError) {
      console.error('Failed to update bucket permissions:', updateError);
    } else {
      console.log(`✅ Bucket "${bucketName}" permissions updated successfully!`);
    }

  } catch (error) {
    console.error('Error creating bucket:', error);
    process.exit(1);
  }
}

// Run the function
createBucket()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });