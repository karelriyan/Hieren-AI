import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function migrate() {
  console.log('Running migrations...');

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "title" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "last_updated" timestamp DEFAULT now() NOT NULL,
        "model_used" text DEFAULT 'meta-llama/llama-4-scout-17b-16e-instruct'
      );
    `);
    console.log('✓ Created sessions table');

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "session_id" uuid NOT NULL,
        "role" text NOT NULL,
        "content" jsonb NOT NULL,
        "status" text DEFAULT 'sent',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "tokens_used" integer
      );
    `);
    console.log('✓ Created messages table');

    // Create attachments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "attachments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "message_id" uuid NOT NULL,
        "file_type" text NOT NULL,
        "file_name" text NOT NULL,
        "base64_data" text,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✓ Created attachments table');

    // Add foreign key constraints
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_sessions_id_fk"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Added messages foreign key');

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk"
        FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Added attachments foreign key');

    await client.end();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await client.end();
    process.exit(1);
  }
}

migrate();
