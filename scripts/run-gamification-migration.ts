import { runGamificationMigration } from '../server/migrations/add-gamification-analytics';

// Execute migration
runGamificationMigration()
  .then(success => {
    if (success) {
      console.log('Migration completed successfully');
      process.exit(0);
    } else {
      console.error('Migration failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });