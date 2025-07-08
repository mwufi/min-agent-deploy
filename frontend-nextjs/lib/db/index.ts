import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DB_URL;

if (!connectionString) {
  throw new Error('DB_URL environment variable is not set');
}

// For query purposes
const queryClient = postgres(connectionString, {
  max: 20, // Reduce pool size (default is 10)
  idle_timeout: 20, // Close idle connections after 20s
  max_lifetime: 60 * 30, // Max connection lifetime 30min
  connect_timeout: 10, // Increase timeout to 10s (from default 5s)
});
export const db = drizzle(queryClient, { schema });

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });