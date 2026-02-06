import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Users Table (NextAuth)
 * Stores user authentication information
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  password: text('password'), // For credentials authentication
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Accounts Table (NextAuth)
 * Stores OAuth provider accounts linked to users
 */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'oauth'
  provider: text('provider').notNull(), // 'google'
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
});

/**
 * Auth Sessions Table (NextAuth)
 * Stores active user authentication sessions
 */
export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expires: timestamp('expires').notNull(),
});

/**
 * Verification Tokens Table (NextAuth)
 * Stores email verification tokens
 */
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
});

/**
 * Chat Sessions Table
 * Stores conversation sessions for the user
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  modelUsed: text('model_used').default('meta-llama/llama-4-scout-17b-16e-instruct'),
});

/**
 * Messages Table
 * Stores all messages in a conversation
 * Content is stored as JSONB to support multimodal content (text + images)
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role', {
      enum: ['user', 'assistant', 'system', 'tool'],
    }).notNull(),
    // Content supports mixed format: string or array of content blocks
    content: jsonb('content').notNull(),
    status: text('status', {
      enum: ['sending', 'sent', 'failed'],
    }).default('sent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    tokensUsed: integer('tokens_used'),
  },
  (_table) => ({
    sessionIdIndex: sql`CREATE INDEX IF NOT EXISTS messages_session_idx ON messages(session_id)`,
  })
);

/**
 * Attachments Table
 * Stores file attachments (images, documents)
 * For images: stores base64 thumbnail
 * For documents: stores file reference and metadata
 */
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    fileType: text('file_type', {
      enum: ['image', 'document'],
    }).notNull(),
    fileName: text('file_name').notNull(),
    // Compressed/thumbnail base64 data for images
    base64Data: text('base64_data'),
    // Metadata for documents (page count, file size, etc.)
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (_table) => ({
    messageIdIndex: sql`CREATE INDEX IF NOT EXISTS attachments_message_idx ON attachments(message_id)`,
  })
);

/**
 * Type exports for use throughout the application
 */
// Auth types
export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewAccount = typeof accounts.$inferInsert;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

// Chat types
export type Session = typeof sessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;

export type NewSession = typeof sessions.$inferInsert;
export type NewMessage = typeof messages.$inferInsert;
export type NewAttachment = typeof attachments.$inferInsert;
