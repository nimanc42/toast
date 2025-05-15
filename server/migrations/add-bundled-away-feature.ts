import { db } from "../db";

/**
 * Migration for Bundled Away feature
 * 
 * This migration:
 * 1. Creates the bundleTag on the notes/reflections table if it doesn't exist
 * 2. Creates an index on the bundleTag column for faster lookups
 */
export async function addBundledAwayFeature() {
  console.log("Running Bundled Away feature migration...");
  
  try {
    // Add the bundleTag column if it doesn't exist yet
    await db.execute(`
      ALTER TABLE notes
      ADD COLUMN IF NOT EXISTS bundle_tag TEXT NULL;
    `);
    
    // Create an index on bundleTag for faster lookups by tag
    await db.execute(`
      CREATE INDEX IF NOT EXISTS reflections_bundleTag_idx ON notes(bundle_tag);
    `);
    
    console.log("✅ Bundled Away migration completed successfully");
  } catch (error) {
    console.error("❌ Error in Bundled Away migration:", error);
    throw error;
  }
}

// Run this migration if executed directly
if (require.main === module) {
  addBundledAwayFeature()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}