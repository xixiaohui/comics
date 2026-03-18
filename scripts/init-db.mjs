#!/usr/bin/env node
/**
 * Database initialization script
 * Run: node scripts/init-db.mjs
 */

import pkg from 'pg';
const { Pool } = pkg;
import { createHash } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || '208.167.233.53',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'comic_db',
  user: process.env.DB_USER || 'comic',
  password: process.env.DB_PASSWORD || 'comic123456',
  ssl: false,
  connectionTimeoutMillis: 8000,
});

const SCHEMA_SQL = `
-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id           SERIAL PRIMARY KEY,
  key_hash     VARCHAR(128) NOT NULL UNIQUE,
  description  VARCHAR(255),
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Comics series table
CREATE TABLE IF NOT EXISTS comics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL UNIQUE,
  description  TEXT,
  cover_image  VARCHAR(500),
  author       VARCHAR(255) DEFAULT 'OpenClaw',
  genre        VARCHAR(100),
  status       VARCHAR(20) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  tags         TEXT[],
  view_count   INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id     UUID NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
  chapter_num  DECIMAL(8,2) NOT NULL,
  title        VARCHAR(255),
  description  TEXT,
  page_count   INTEGER DEFAULT 0,
  view_count   INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comic_id, chapter_num)
);

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  comic_id     UUID NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
  page_num     INTEGER NOT NULL,
  image_url    VARCHAR(500) NOT NULL,
  image_path   VARCHAR(500),
  width        INTEGER,
  height       INTEGER,
  file_size    INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, page_num)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comics_slug        ON comics(slug);
CREATE INDEX IF NOT EXISTS idx_comics_created_at  ON comics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapters_comic_id  ON chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_num       ON chapters(comic_id, chapter_num);
CREATE INDEX IF NOT EXISTS idx_pages_chapter_id   ON pages(chapter_id);
CREATE INDEX IF NOT EXISTS idx_pages_comic_id     ON pages(comic_id);

-- Auto update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_comics_updated_at ON comics;
CREATE TRIGGER update_comics_updated_at
  BEFORE UPDATE ON comics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto update page_count trigger
CREATE OR REPLACE FUNCTION update_chapter_page_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chapters SET page_count = page_count + 1 WHERE id = NEW.chapter_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chapters SET page_count = GREATEST(page_count - 1, 0) WHERE id = OLD.chapter_id;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_page_count ON pages;
CREATE TRIGGER update_page_count
  AFTER INSERT OR DELETE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_chapter_page_count();
`;

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to PostgreSQL at', process.env.DB_HOST);
    console.log('📦 Database:', process.env.DB_NAME);
    console.log('');

    console.log('⚙️  Running schema migration...');
    await client.query(SCHEMA_SQL);
    console.log('✅ Schema created/updated successfully');

    // Register API key
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      const keyHash = createHash('sha256').update(apiKey).digest('hex');
      await client.query(`
        INSERT INTO api_keys (key_hash, description)
        VALUES ($1, 'OpenClaw primary API key')
        ON CONFLICT (key_hash) DO UPDATE SET
          description = EXCLUDED.description,
          is_active = true
      `, [keyHash]);
      console.log('✅ API key registered in database');
    }

    // Verify tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('');
    console.log('📋 Tables in database:');
    tables.rows.forEach(row => console.log('  ✓', row.table_name));
    console.log('');
    console.log('🎉 Database initialization complete!');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Init failed:', err.message);
  process.exit(1);
});
