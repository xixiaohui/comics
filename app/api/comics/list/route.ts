/**
 * GET /api/comics/list
 * 
 * List all published comics with pagination
 * 
 * Query params:
 *   - page     number  default: 1
 *   - limit    number  default: 20, max: 100
 *   - genre    string  filter by genre
 *   - status   string  filter by status
 *   - search   string  search title
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;
  const genre = searchParams.get('genre')?.trim();
  const status = searchParams.get('status')?.trim();
  const search = searchParams.get('search')?.trim();

  const conditions: string[] = ['c.is_published = true'];
  const params: unknown[] = [];

  if (genre) {
    params.push(genre);
    conditions.push(`c.genre ILIKE $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`c.title ILIKE $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM comics c ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get comics with latest chapter info
    params.push(limit, offset);
    const comicsResult = await query(
      `SELECT
         c.id, c.title, c.slug, c.description, c.cover_image,
         c.author, c.genre, c.status, c.tags, c.view_count,
         c.created_at, c.updated_at,
         (SELECT COUNT(*) FROM chapters ch WHERE ch.comic_id = c.id AND ch.is_published = true) AS chapter_count,
         (SELECT MAX(ch.chapter_num) FROM chapters ch WHERE ch.comic_id = c.id AND ch.is_published = true) AS latest_chapter
       FROM comics c
       ${where}
       ORDER BY c.updated_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return Response.json({
      success: true,
      data: comicsResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: offset + limit < total,
        has_prev: page > 1,
      },
    });
  } catch (error) {
    console.error('List comics error:', error);
    return Response.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
