/**
 * GET /api/comics/[id]
 * Get comic detail by id or slug
 * 
 * Query params:
 *   - chapters  boolean  include chapters list (default: true)
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const includeChapters = searchParams.get('chapters') !== 'false';

  try {
    // Try by UUID first, then by slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const whereClause = isUuid ? 'c.id = $1' : 'c.slug = $1';

    const comicResult = await query(
      `SELECT
         c.id, c.title, c.slug, c.description, c.cover_image,
         c.author, c.genre, c.status, c.tags, c.view_count,
         c.created_at, c.updated_at,
         (SELECT COUNT(*) FROM chapters ch WHERE ch.comic_id = c.id AND ch.is_published = true) AS chapter_count
       FROM comics c
       WHERE ${whereClause} AND c.is_published = true`,
      [id]
    );

    if (comicResult.rows.length === 0) {
      return Response.json({ success: false, error: 'Comic not found' }, { status: 404 });
    }

    const comic = comicResult.rows[0];

    // Increment view count
    query(`UPDATE comics SET view_count = view_count + 1 WHERE id = $1`, [comic.id]).catch(console.error);

    let chapters = [];
    if (includeChapters) {
      const chaptersResult = await query(
        `SELECT id, chapter_num, title, description, page_count, view_count, published_at
         FROM chapters
         WHERE comic_id = $1 AND is_published = true
         ORDER BY chapter_num ASC`,
        [comic.id]
      );
      chapters = chaptersResult.rows;
    }

    return Response.json({
      success: true,
      data: { ...comic, chapters },
    });
  } catch (error) {
    console.error('Get comic error:', error);
    return Response.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

/**
 * PATCH /api/comics/[id]
 * Update comic metadata (requires API key)
 */
import { validateApiKey, unauthorized } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isValid = await validateApiKey(request);
  if (!isValid) return unauthorized();

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, description, genre, status, tags, cover_image, is_published } = body;

    const result = await query(
      `UPDATE comics SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         genre = COALESCE($3, genre),
         status = COALESCE($4, status),
         tags = COALESCE($5, tags),
         cover_image = COALESCE($6, cover_image),
         is_published = COALESCE($7, is_published)
       WHERE id = $8 OR slug = $8
       RETURNING id, title, slug, status`,
      [title, description, genre, status, tags, cover_image, is_published, id]
    );

    if (result.rows.length === 0) {
      return Response.json({ success: false, error: 'Comic not found' }, { status: 404 });
    }

    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update comic error:', error);
    return Response.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}
