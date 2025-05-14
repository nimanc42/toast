import { db, pool } from '../db';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

async function createFriendshipsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "friendships" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "friend_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "status" TEXT NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE("user_id", "friend_id")
      );
    `);
    console.log('Created friendships table');
  } catch (error) {
    console.error('Error creating friendships table:', error);
    throw error;
  }
}

async function createSharedToastsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "shared_toasts" (
        "id" SERIAL PRIMARY KEY,
        "toast_id" INTEGER NOT NULL REFERENCES "toasts"("id"),
        "share_code" TEXT NOT NULL UNIQUE,
        "visibility" TEXT NOT NULL DEFAULT 'friends-only',
        "allow_comments" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "expires_at" TIMESTAMP,
        "view_count" INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log('Created shared_toasts table');
  } catch (error) {
    console.error('Error creating shared_toasts table:', error);
    throw error;
  }
}

async function createToastReactionsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "toast_reactions" (
        "id" SERIAL PRIMARY KEY,
        "toast_id" INTEGER NOT NULL REFERENCES "toasts"("id"),
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "reaction" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE("toast_id", "user_id")
      );
    `);
    console.log('Created toast_reactions table');
  } catch (error) {
    console.error('Error creating toast_reactions table:', error);
    throw error;
  }
}

async function createToastCommentsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "toast_comments" (
        "id" SERIAL PRIMARY KEY,
        "toast_id" INTEGER NOT NULL REFERENCES "toasts"("id"),
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "comment" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('Created toast_comments table');
  } catch (error) {
    console.error('Error creating toast_comments table:', error);
    throw error;
  }
}

async function updateToastsTable() {
  try {
    // Check if the columns already exist
    const sharedColumnExists = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='toasts' AND column_name='shared';
    `);
    
    const shareUrlColumnExists = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='toasts' AND column_name='share_url';
    `);
    
    // Add the columns if they don't exist
    if (sharedColumnExists.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE "toasts" ADD COLUMN "shared" BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      console.log('Added shared column to toasts table');
    }
    
    if (shareUrlColumnExists.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE "toasts" ADD COLUMN "share_url" TEXT;
      `);
      console.log('Added share_url column to toasts table');
    }
  } catch (error) {
    console.error('Error updating toasts table:', error);
    throw error;
  }
}

export async function runMigration() {
  try {
    console.log('Running social features migration...');
    
    // Create new tables
    await createFriendshipsTable();
    await createSharedToastsTable();
    await createToastReactionsTable();
    await createToastCommentsTable();
    
    // Update existing tables
    await updateToastsTable();
    
    console.log('Social features migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // No need to close the pool as it's shared with the app
  }
}

// ESM doesn't have require.main, so we'll check differently
const isMainModule = import.meta.url.endsWith(process.argv[1]);

if (isMainModule) {
  runMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}