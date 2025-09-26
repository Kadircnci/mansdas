// Database utilities for Next.js API routes
import { sql } from '@vercel/postgres';

export async function createTables() {
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS "User" (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user'
      )
    `;

    // Posts table
    await sql`
      CREATE TABLE IF NOT EXISTS "Post" (
        id SERIAL PRIMARY KEY,
        author_id INTEGER REFERENCES "User"(id),
        title VARCHAR(500) NOT NULL,
        content TEXT,
        scheduled_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'taslak',
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        platforms JSONB DEFAULT '[]',
        caption TEXT,
        tone VARCHAR(100),
        account_id INTEGER
      )
    `;

    // Accounts table
    await sql`
      CREATE TABLE IF NOT EXISTS "Account" (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES "User"(id),
        platform VARCHAR(100) NOT NULL,
        external_id VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP
      )
    `;

    // Content table
    await sql`
      CREATE TABLE IF NOT EXISTS "Content" (
        id SERIAL PRIMARY KEY,
        author_id INTEGER REFERENCES "User"(id),
        title VARCHAR(500) NOT NULL,
        content_text TEXT,
        mode VARCHAR(50) NOT NULL,
        tone VARCHAR(100),
        user_prompt TEXT,
        generated_content TEXT,
        platforms JSONB DEFAULT '[]'
      )
    `;

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}