import { runMigration } from '../server/migrations/add-social-features';

// Run the migration
runMigration()
  .then(() => {
    console.log('Social features migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });