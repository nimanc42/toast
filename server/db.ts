import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure websocket for Neon Serverless
neonConfig.webSocketConstructor = ws;

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Create database pool and client
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Helper function to check database connection
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    client.release();
    return true;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return false;
  }
}