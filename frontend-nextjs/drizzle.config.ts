import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DB_URL!,
  },
  migrations: {
    table: 'migrations',
    schema: 'public',
  },
});