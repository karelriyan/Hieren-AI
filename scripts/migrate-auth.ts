import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function migrateAuth() {
  console.log('Running authentication database migration...');

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text,
        "email" text NOT NULL UNIQUE,
        "email_verified" timestamp,
        "image" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✓ Created users table');

    // Create accounts table (OAuth providers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "type" text NOT NULL,
        "provider" text NOT NULL,
        "provider_account_id" text NOT NULL,
        "refresh_token" text,
        "access_token" text,
        "expires_at" integer,
        "token_type" text,
        "scope" text,
        "id_token" text,
        CONSTRAINT "accounts_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
    console.log('✓ Created accounts table');

    // Create auth_sessions table (NextAuth sessions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "auth_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "session_token" text NOT NULL UNIQUE,
        "user_id" uuid NOT NULL,
        "expires" timestamp NOT NULL,
        CONSTRAINT "auth_sessions_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
    console.log('✓ Created auth_sessions table');

    // Create verification_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "verification_tokens" (
        "identifier" text NOT NULL,
        "token" text NOT NULL UNIQUE,
        "expires" timestamp NOT NULL
      );
    `);
    console.log('✓ Created verification_tokens table');

    // Add userId column to sessions table if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sessions' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE "sessions" ADD COLUMN "user_id" uuid;

          ALTER TABLE "sessions"
          ADD CONSTRAINT "sessions_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    console.log('✓ Added user_id column to sessions table');

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_last_updated ON sessions(last_updated DESC);
      CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
    `);
    console.log('✓ Created performance indexes');

    await client.end();
    console.log('\n✅ Authentication migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await client.end();
    process.exit(1);
  }
}

migrateAuth();
