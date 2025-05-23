import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "../shared/schema";

/**
 * Script to update the database schema with our new firstLogin field
 */
async function updateSchema() {
  console.log("Adding firstLogin field to users table...");
  
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  try {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });
    
    const db = drizzle(pool, { schema });
    
    // First try to update the schema directly
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_login BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    
    console.log("Schema updated successfully");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error updating schema:", error);
    process.exit(1);
  }
}

updateSchema();