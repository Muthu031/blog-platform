import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection string from environment
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/postgres';

// Create postgres client
const client = postgres(connectionString, { prepare: false });

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

console.log('Database connected successfully on port 5432');

// Export client for direct use if needed
export { client };