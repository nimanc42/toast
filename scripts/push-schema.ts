import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Function to run drizzle-kit push command
function pushSchema() {
  console.log('Pushing schema to database...');
  
  try {
    // Execute the drizzle-kit push command
    execSync('npx drizzle-kit push:pg', { 
      stdio: 'inherit',
      env: process.env
    });
    
    console.log('Schema push completed successfully');
  } catch (error) {
    console.error('Schema push failed:', error);
    process.exit(1);
  }
}

// Run the push
pushSchema();