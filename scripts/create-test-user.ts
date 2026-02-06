import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createTestUser() {
  const email = 'demo@hieren.ai';
  const password = 'demo123456';
  const name = 'Demo User';

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await sql`
      INSERT INTO users (id, email, name, password, created_at)
      VALUES (gen_random_uuid(), ${email}, ${name}, ${hashedPassword}, NOW())
      ON CONFLICT (email) DO NOTHING;
    `;

    console.log('✅ Test user created!');
    console.log('\n📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('\n🎯 Go to http://localhost:3000 and sign in with these credentials');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

createTestUser();
