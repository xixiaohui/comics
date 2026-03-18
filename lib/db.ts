import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '208.167.233.53',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'comic_db',
  user: process.env.DB_USER || 'comic',
  password: process.env.DB_PASSWORD || 'comic123456',
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
