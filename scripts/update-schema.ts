import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Script to update the database schema with our new timezone and weekly_toast_day columns
 */
async function updateSchema() {
  try {
    console.log('Adding timezone and weekly_toast_day columns to users table...');
    
    // Check if the columns already exist before adding them
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('timezone', 'weekly_toast_day')
    `);
    
    const columns = checkResult.rows.map(row => row.column_name);
    
    // Add timezone column if it doesn't exist
    if (!columns.includes('timezone')) {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN timezone TEXT DEFAULT 'UTC'
      `);
      console.log('Added timezone column');
    } else {
      console.log('timezone column already exists');
    }
    
    // Add weekly_toast_day column if it doesn't exist
    if (!columns.includes('weekly_toast_day')) {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN weekly_toast_day INTEGER DEFAULT 0
      `);
      console.log('Added weekly_toast_day column');
    } else {
      console.log('weekly_toast_day column already exists');
    }
    
    // Update toasts table with new columns
    console.log('Updating toasts table...');
    
    const toastsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'toasts' 
      AND column_name IN ('type', 'interval_start', 'interval_end')
    `);
    
    const toastColumns = toastsCheck.rows.map(row => row.column_name);
    
    // Add type column
    if (!toastColumns.includes('type')) {
      await db.execute(sql`
        ALTER TABLE toasts 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'weekly'
      `);
      console.log('Added type column to toasts table');
    } else {
      console.log('type column already exists in toasts table');
    }
    
    // Add interval_start column
    if (!toastColumns.includes('interval_start')) {
      await db.execute(sql`
        ALTER TABLE toasts 
        ADD COLUMN interval_start TIMESTAMP WITH TIME ZONE
      `);
      console.log('Added interval_start column to toasts table');
    } else {
      console.log('interval_start column already exists in toasts table');
    }
    
    // Add interval_end column
    if (!toastColumns.includes('interval_end')) {
      await db.execute(sql`
        ALTER TABLE toasts 
        ADD COLUMN interval_end TIMESTAMP WITH TIME ZONE
      `);
      console.log('Added interval_end column to toasts table');
    } else {
      console.log('interval_end column already exists in toasts table');
    }
    
    // Check if unique constraint exists
    const constraintCheck = await db.execute(sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'toasts'
      AND constraint_name = 'toast_unique_idx'
    `);
    
    // Add unique constraint if it doesn't exist
    if (constraintCheck.rowCount === 0) {
      await db.execute(sql`
        ALTER TABLE toasts
        ADD CONSTRAINT toast_unique_idx UNIQUE (user_id, type, interval_start)
      `);
      console.log('Added unique constraint to toasts table');
    } else {
      console.log('Unique constraint already exists on toasts table');
    }
    
    console.log('Database schema update completed successfully');
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

updateSchema();