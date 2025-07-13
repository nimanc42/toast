import { neonConfig } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

// Disable WebSocket completely
neonConfig.webSocketConstructor = undefined;
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineConnect = false;

// Check DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Testing database connection...');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

// Create pool with minimal settings
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✓ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('✓ Query successful:', result.rows[0]);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();