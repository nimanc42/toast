
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addDailyReminderHour() {
  console.log('Adding daily_reminder_hour column to voice_preferences table...');
  
  try {
    // Add the column with default value of 9 (9 AM)
    await db.execute(sql`
      ALTER TABLE voice_preferences 
      ADD COLUMN IF NOT EXISTS daily_reminder_hour INTEGER NOT NULL DEFAULT 9
    `);
    
    console.log('Successfully added daily_reminder_hour column');
  } catch (error) {
    console.error('Error adding daily_reminder_hour column:', error);
  }
}

// Run the migration
addDailyReminderHour()
  .then(() => {
    console.log('Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
