import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkDatabase() {
  try {
    console.log('\n=== CHECKING DATABASE CONNECTION ===\n');

    // Show connection info (hide password)
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
    const hostMatch = dbUrl.match(/@([^/]+)/);
    const host = hostMatch ? hostMatch[1] : 'unknown';
    console.log('🔌 Connected to:', host);

    // List all tables
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log('\n📋 Tables in database:');
    if (tables.rows.length === 0) {
      console.log('   ❌ NO TABLES FOUND!');
    } else {
      tables.rows.forEach((row: any) => {
        console.log('   ✅', row.tablename);
      });
    }

    // Check if users table exists and has data
    try {
      const userCount = await sql`SELECT COUNT(*) FROM users;`;
      console.log('\n👥 Users in database:', userCount.rows[0].count);

      const users = await sql`SELECT id, email, name, created_at FROM users LIMIT 5;`;
      console.log('\n📝 Sample users:');
      users.rows.forEach((user: any) => {
        console.log(`   - ${user.email} (${user.name || 'no name'})`);
      });
    } catch (error: any) {
      console.log('\n❌ Error checking users table:', error.message);
    }

  } catch (error: any) {
    console.error('\n❌ Database Error:', error.message);
  }
}

checkDatabase();
