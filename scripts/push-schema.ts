import { db } from "../server/db";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/**
 * Push schema to database
 */
async function pushSchema() {
  try {
    console.log("Starting schema migration...");
    
    // Run the migration
    await migrate(db, { migrationsFolder: "./drizzle" });
    
    console.log("Schema migration completed successfully!");
  } catch (error) {
    console.error("Error during schema migration:", error);
  } finally {
    await db.$pool.end();
  }
}

// Run if called directly
if (process.argv[1] === import.meta.url) {
  pushSchema()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}