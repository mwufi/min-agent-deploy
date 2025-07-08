import postgres from 'postgres';

async function resetDatabase() {
  const connectionString = process.env.DB_URL;
  
  if (!connectionString) {
    console.error('DB_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('Dropping existing tables...');
    
    // Drop tables in reverse order of dependencies
    await sql`DROP TABLE IF EXISTS email_messages CASCADE`;
    await sql`DROP TABLE IF EXISTS email_threads CASCADE`;
    await sql`DROP TABLE IF EXISTS gmail_sync_history CASCADE`;
    await sql`DROP TABLE IF EXISTS migrations CASCADE`;
    
    console.log('Tables dropped successfully!');
    console.log('Now run: bun run scripts/apply-migration.ts');
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the reset
resetDatabase();