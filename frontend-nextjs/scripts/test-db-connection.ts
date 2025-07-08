import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  const connectionString = process.env.DB_URL;
  
  if (!connectionString) {
    console.error('❌ DB_URL environment variable is not set');
    process.exit(1);
  }
  
  // Parse connection details
  const url = new URL(connectionString);
  console.log('📡 Connection details:');
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Port: ${url.port}`);
  console.log(`   Database: ${url.pathname.slice(1)}`);
  console.log(`   User: ${url.username}`);
  console.log(`   SSL: ${url.searchParams.get('sslmode') || 'not specified'}`);
  console.log(`   Pooler: ${url.port === '6543' ? 'Yes (Transaction mode)' : url.port === '5432' ? 'No (Direct connection)' : 'Unknown'}`);
  console.log('');
  
  // Test 1: Basic connection
  console.log('1️⃣  Testing basic connection...');
  const startTime = Date.now();
  
  try {
    const testClient = postgres(connectionString, {
      max: 1,
      connect_timeout: 10,
      idle_timeout: 0,
      max_lifetime: 0,
    });
    
    const result = await testClient`SELECT 1 as test`;
    const connectionTime = Date.now() - startTime;
    
    console.log(`✅ Basic connection successful (${connectionTime}ms)`);
    await testClient.end();
  } catch (error) {
    console.error('❌ Basic connection failed:', error);
    process.exit(1);
  }
  
  // Test 2: Drizzle connection
  console.log('\n2️⃣  Testing Drizzle ORM connection...');
  try {
    // Use a simpler query that works better with transaction mode
    const result = await db.execute(sql`SELECT 1 as test, NOW() as current_time`);
    console.log('✅ Drizzle connection successful');
    
    // Handle different response formats (drizzle-orm/postgres-js differences)
    const data = result.rows || result;
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      console.log(`   Test query returned: ${row.test}`);
      console.log(`   Server time: ${new Date(row.current_time).toLocaleString()}`);
    }
    
    // Try to get database info with a more compatible query
    try {
      const dbInfo = await db.execute(sql`SELECT current_database() as db`);
      const dbData = dbInfo.rows || dbInfo;
      if (Array.isArray(dbData) && dbData.length > 0) {
        console.log(`   Database: ${dbData[0].db}`);
      }
    } catch (e) {
      // Ignore if this fails in transaction mode
    }
  } catch (error) {
    console.error('❌ Drizzle connection failed:', error);
    process.exit(1);
  }
  
  // Test 3: Table check
  console.log('\n3️⃣  Checking tables...');
  try {
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    const tableData = tables.rows || tables;
    if (Array.isArray(tableData)) {
      console.log(`✅ Found ${tableData.length} tables:`);
      tableData.forEach((row: any) => {
        console.log(`   - ${row.tablename}`);
      });
    } else {
      console.log('✅ Table query executed (details unavailable in transaction mode)');
    }
  } catch (error) {
    console.error('❌ Table check failed:', error);
  }
  
  // Test 4: Connection pool stress test
  console.log('\n4️⃣  Testing connection pool (5 concurrent queries)...');
  try {
    const promises = Array(5).fill(0).map(async (_, i) => {
      const start = Date.now();
      await db.execute(sql`SELECT pg_sleep(0.1), ${i} as query_num`);
      return Date.now() - start;
    });
    
    const times = await Promise.all(promises);
    console.log('✅ Connection pool test successful');
    console.log(`   Query times: ${times.map(t => `${t}ms`).join(', ')}`);
    console.log(`   Average: ${Math.round(times.reduce((a, b) => a + b) / times.length)}ms`);
  } catch (error) {
    console.error('❌ Connection pool test failed:', error);
  }
  
  // Test 5: Check for connection limits
  console.log('\n5️⃣  Checking connection limits...');
  try {
    const stats = await db.execute(sql`
      SELECT 
        max_conn,
        used,
        res_for_super,
        max_conn - used - res_for_super as available
      FROM 
        (SELECT count(*) used FROM pg_stat_activity) t1,
        (SELECT setting::int res_for_super FROM pg_settings WHERE name = 'superuser_reserved_connections') t2,
        (SELECT setting::int max_conn FROM pg_settings WHERE name = 'max_connections') t3
    `);
    
    const statData = stats.rows || stats;
    if (Array.isArray(statData) && statData.length > 0) {
      const stat = statData[0] as any;
      console.log('✅ Connection stats:');
      console.log(`   Max connections: ${stat.max_conn}`);
      console.log(`   Currently used: ${stat.used}`);
      console.log(`   Available: ${stat.available}`);
      
      if (stat.available < 10) {
        console.warn('⚠️  Warning: Low available connections!');
      }
    } else {
      console.log('✅ Connection pool is working (detailed stats unavailable in transaction mode)');
    }
  } catch (error) {
    console.error('❌ Connection stats check failed:', error);
  }
  
  console.log('\n✨ All tests completed!\n');
  
  // Recommendations
  console.log('💡 Recommendations:');
  if (url.port === '5432') {
    console.log('   - Consider using Supabase pooler (port 6543) for better serverless performance');
  }
  if (!url.searchParams.get('sslmode')) {
    console.log('   - Consider adding ?sslmode=require for secure connections');
  }
  
  process.exit(0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
testConnection().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});