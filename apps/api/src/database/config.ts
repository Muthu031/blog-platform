import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Database connection string from environment
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dbname';

// Create postgres client
const client = postgres(connectionString, { prepare: false });

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export client for direct use if needed
export { client };