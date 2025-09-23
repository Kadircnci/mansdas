-- Vercel Postgres Database Schema
-- Bu SQL'i Vercel Postgres console'da çalıştırın

-- Users table
CREATE TABLE "User" (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user'
);

-- Posts table
CREATE TABLE "Post" (
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
);

-- Accounts table
CREATE TABLE "Account" (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES "User"(id),
  platform VARCHAR(100) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP
);

-- Content table
CREATE TABLE "Content" (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES "User"(id),
  title VARCHAR(500) NOT NULL,
  content_text TEXT,
  mode VARCHAR(50) NOT NULL,
  tone VARCHAR(100),
  user_prompt TEXT,
  generated_content TEXT,
  platforms JSONB DEFAULT '[]'
);

-- Indexes
CREATE INDEX idx_user_username ON "User"(username);
CREATE INDEX idx_user_role ON "User"(role);
CREATE INDEX idx_post_author ON "Post"(author_id);
CREATE INDEX idx_post_status ON "Post"(status);
CREATE INDEX idx_account_owner ON "Account"(owner_id);
CREATE INDEX idx_account_platform ON "Account"(platform);
CREATE INDEX idx_content_author ON "Content"(author_id);
CREATE INDEX idx_content_mode ON "Content"(mode);

-- Insert default admin user
INSERT INTO "User" (username, password_hash, role) 
VALUES ('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5bJXJrfHyq', 'admin');
-- Password: admin123