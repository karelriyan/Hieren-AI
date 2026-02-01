import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  uuid,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Chat Sessions Table
 * Stores conversation sessions for the user
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
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
  (table) => ({
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
  (table) => ({
    messageIdIndex: sql`CREATE INDEX IF NOT EXISTS attachments_message_idx ON attachments(message_id)`,
  })
);

/**
 * Type exports for use throughout the application
 */
export type Session = typeof sessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;

export type NewSession = typeof sessions.$inferInsert;
export type NewMessage = typeof messages.$inferInsert;
export type NewAttachment = typeof attachments.$inferInsert;
