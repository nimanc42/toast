import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Create badges table for gamification
 */
async function createBadgesTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        category TEXT NOT NULL,
        threshold INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('Badges table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating badges table:', error);
    return false;
  }
}

/**
 * Create user badges table to track earned badges
 */
async function createUserBadgesTable() {
  try {
    await db.execute(SQL`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        badge_id INTEGER NOT NULL REFERENCES badges(id),
        awarded_at TIMESTAMP DEFAULT NOW() NOT NULL,
        seen BOOLEAN NOT NULL DEFAULT FALSE,
        UNIQUE(user_id, badge_id)
      );
    `);
    console.log('User badges table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating user badges table:', error);
    return false;
  }
}

/**
 * Create user activity table for analytics
 */
async function createUserActivityTable() {
  try {
    await db.execute(SQL`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        activity_type TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('User activity table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating user activity table:', error);
    return false;
  }
}

/**
 * Seed initial badge data
 */
async function seedBadges() {
  try {
    // Check if badges table already has records
    const existingBadges = await db.execute(SQL`SELECT COUNT(*) FROM badges`);
    const count = parseInt(existingBadges.rows[0].count);
    
    if (count > 0) {
      console.log(`Badges table already has ${count} records, skipping seed`);
      return true;
    }
    
    // Insert default badge types
    await db.execute(SQL`
      INSERT INTO badges (name, description, icon, category, threshold)
      VALUES 
        ('Beginner', 'Created your first reflection', 'award', 'notes', 1),
        ('Consistent', 'Added 3 reflections in one week', 'calendar', 'notes', 3),
        ('Dedicated', 'Added reflection for 7 days in a row', 'trending-up', 'streak', 7),
        ('Committed', 'Added reflection for 30 days in a row', 'award-star', 'streak', 30),
        ('Master', 'Added reflection for 100 days in a row', 'crown', 'streak', 100),
        ('Social Butterfly', 'Shared 5 toasts with friends', 'share', 'social', 5),
        ('Popular', 'Received 10 reactions on your toasts', 'heart', 'social', 10),
        ('Influencer', 'Received 50 reactions across all your toasts', 'thumbs-up', 'social', 50);
    `);
    
    console.log('Badges seeded successfully');
    return true;
  } catch (error) {
    console.error('Error seeding badges:', error);
    return false;
  }
}

/**
 * Run the full migration
 */
export async function runGamificationMigration() {
  console.log('Starting gamification and analytics migration...');
  
  const badgesCreated = await createBadgesTable();
  if (!badgesCreated) return false;
  
  const userBadgesCreated = await createUserBadgesTable();
  if (!userBadgesCreated) return false;
  
  const userActivityCreated = await createUserActivityTable();
  if (!userActivityCreated) return false;
  
  const badgesSeeded = await seedBadges();
  if (!badgesSeeded) return false;
  
  console.log('Gamification and analytics migration completed successfully');
  return true;
}