import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Create database pool and client with Replit PostgreSQL optimized settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduced for Replit environment
  idleTimeoutMillis: 10000, // Shorter idle timeout
  connectionTimeoutMillis: 5000, // Longer connection timeout
  acquireTimeoutMillis: 10000, // Add acquire timeout
  allowExitOnIdle: true, // Allow pool to exit when idle
});

export const db = drizzle(pool, { schema });

// Helper function to check database connection
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}