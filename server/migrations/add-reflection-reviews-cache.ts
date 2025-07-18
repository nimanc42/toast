
import { db } from "../db";

export async function addReflectionReviewsCache() {
  console.log("Adding reflection_reviews table for caching...");
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reflection_reviews (
      id SERIAL PRIMARY KEY,
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      review_text TEXT NOT NULL,
      audio_url TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  
  // Add unique index to prevent duplicate reviews for the same note
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reflection_reviews_note_id 
    ON reflection_reviews(note_id);
  `);
  
  console.log("reflection_reviews table created successfully");
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addReflectionReviewsCache()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
