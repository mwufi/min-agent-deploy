import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  const connectionString = process.env.DB_URL;
  
  if (!connectionString) {
    console.error('DB_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'drizzle/0000_same_dragon_man.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL.split('--> statement-breakpoint').filter(s => s.trim());
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await sql.unsafe(statement);
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the migration
applyMigration();