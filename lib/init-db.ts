/**
 * Database Schema Initialization Script
 * Run: npx ts-node lib/init-db.ts
 * Or:  node -r @swc/register lib/init-db.ts
 * 
 * Tables:
 *   comics      - comic series metadata
 *   chapters    - chapters of each comic
 *   pages       - individual pages within chapters
 *   api_keys    - API authentication keys
 */

import pool from './db';

const SCHEMA_SQL = `
-- =============================================
-- Comics Platform Database Schema
-- =============================================

-- API Keys table (for submit authentication)
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

-- Pages table (individual comic page images)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comics_slug         ON comics(slug);
CREATE INDEX IF NOT EXISTS idx_comics_created_at   ON comics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comics_status        ON comics(status);
CREATE INDEX IF NOT EXISTS idx_chapters_comic_id    ON chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_num         ON chapters(comic_id, chapter_num);
CREATE INDEX IF NOT EXISTS idx_pages_chapter_id     ON pages(chapter_id);
CREATE INDEX IF NOT EXISTS idx_pages_comic_id       ON pages(comic_id);

-- Function: auto update comics.updated_at
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

-- Function: auto update chapter page_count
CREATE OR REPLACE FUNCTION update_chapter_page_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chapters SET page_count = page_count + 1 WHERE id = NEW.chapter_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chapters SET page_count = page_count - 1 WHERE id = OLD.chapter_id;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_page_count ON pages;
CREATE TRIGGER update_page_count
  AFTER INSERT OR DELETE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_chapter_page_count();
`;

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🚀 Initializing database schema...');
    await client.query(SCHEMA_SQL);
    console.log('✅ Schema created successfully');

    // Insert API key (sha256 hash of the key)
    const crypto = await import('crypto');
    const apiKey = process.env.API_KEY || '89d42f249496a09eb9478ed94edbcbf9603e30e02aabe9c6c71af8c14178ca7f';
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    await client.query(`
      INSERT INTO api_keys (key_hash, description)
      VALUES ($1, 'OpenClaw auto-generated key')
      ON CONFLICT (key_hash) DO NOTHING
    `, [keyHash]);

    console.log('✅ API key registered');
    console.log('📋 Database initialization complete!');
    console.log('');
    console.log('Tables created:');
    console.log('  - api_keys');
    console.log('  - comics');
    console.log('  - chapters');
    console.log('  - pages');
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase().catch(console.error);
