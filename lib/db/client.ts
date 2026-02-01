import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema';

/**
 * Initialize Drizzle ORM with Vercel Postgres
 * This client is used for all database operations
 */
const db = drizzle(sql, { schema });

export default db;
export * from './schema';
