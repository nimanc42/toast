import { db } from '../db';
import { sql } from 'drizzle-orm';
import { log } from '../vite';

interface BadgeData {
  name: string;
  description: string;
  category: string;
  icon: string;
  metadata: any;
}

const initialBadges: BadgeData[] = [
  {
    name: "Noteworthy Beginner",
    description: "You've completed your first note! The journey of a thousand miles begins with a single step.",
    category: "streak",
    icon: "🏅",
    metadata: { days: 1 }
  },
  {
    name: "Consistent Contributor",
    description: "You've maintained a 3-day streak! Your commitment is starting to show.",
    category: "streak",
    icon: "🥉",
    metadata: { days: 3 }
  },
  {
    name: "Week Warrior",
    description: "You've maintained a 7-day streak! Keep up the great work!",
    category: "streak",
    icon: "🥈",
    metadata: { days: 7 }
  },
  {
    name: "Fortnight Achiever",
    description: "Two weeks of consistent notes! Your dedication is impressive.",
    category: "streak",
    icon: "⭐",
    metadata: { days: 14 }
  },
  {
    name: "Month Master",
    description: "A full month of daily notes! You're now building a powerful habit.",
    category: "streak",
    icon: "🥇",
    metadata: { days: 30 }
  },
  {
    name: "Quarter Champion",
    description: "Three months of consistent note-taking! Your commitment is extraordinary.",
    category: "streak",
    icon: "🏆",
    metadata: { days: 90 }
  }
];

export async function runGamificationMigration(): Promise<boolean> {
  try {
    log('Starting gamification and analytics migration...', 'migration');
    
    // Create badges table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        icon VARCHAR(20) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    log('Badges table created successfully', 'migration');
    
    // Create user_badges table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        seen BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      )
    `);
    log('User badges table created successfully', 'migration');
    
    // Create user_activity table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    log('User activity table created successfully', 'migration');
    
    // Create function to calculate user streak
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_user_streak(user_id_param INTEGER)
      RETURNS INTEGER AS $$
      DECLARE
        streak INTEGER := 0;
        current_date DATE := CURRENT_DATE;
        previous_date DATE;
        note_date DATE;
        note_record RECORD;
      BEGIN
        -- Get the last note date for this user
        SELECT DATE(created_at) INTO note_date
        FROM notes
        WHERE user_id = user_id_param
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- If no notes or last note is more than a day old, streak is 0
        IF note_date IS NULL OR note_date < (current_date - INTERVAL '1 day') THEN
          RETURN 0;
        END IF;
        
        -- Count sequential days with notes, working backwards from today
        previous_date := current_date;
        
        FOR note_record IN (
          SELECT DISTINCT DATE(created_at) AS note_date
          FROM notes
          WHERE user_id = user_id_param
          ORDER BY note_date DESC
        ) LOOP
          -- If this note date is consecutive with the previous one, increment streak
          IF note_record.note_date = previous_date OR note_record.note_date = (previous_date - INTERVAL '1 day') THEN
            streak := streak + 1;
            previous_date := note_record.note_date;
          ELSE
            -- Break on first gap
            EXIT;
          END IF;
        END LOOP;
        
        RETURN streak;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Seed initial badges
    for (const badge of initialBadges) {
      await db.execute(sql`
        INSERT INTO badges (name, description, category, icon, metadata)
        VALUES (${badge.name}, ${badge.description}, ${badge.category}, ${badge.icon}, ${JSON.stringify(badge.metadata)}::jsonb)
        ON CONFLICT DO NOTHING
      `);
    }
    log('Badges seeded successfully', 'migration');
    
    log('Gamification and analytics migration completed successfully', 'migration');
    return true;
  } catch (error) {
    log(`Error in gamification migration: ${error}`, 'migration');
    return false;
  }
}