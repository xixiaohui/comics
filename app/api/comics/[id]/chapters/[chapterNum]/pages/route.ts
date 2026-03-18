/**
 * GET /api/comics/[id]/chapters/[chapterNum]/pages
 * Get all pages for a specific chapter
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterNum: string }> }
) {
  const { id, chapterNum } = await params;
  const chNum = parseFloat(chapterNum);

  if (isNaN(chNum)) {
    return Response.json({ success: false, error: 'Invalid chapter number' }, { status: 400 });
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const comicWhere = isUuid ? 'c.id = $1' : 'c.slug = $1';

    const result = await query(
      `SELECT
         p.id, p.page_num, p.image_url, p.width, p.height,
         ch.id AS chapter_id, ch.chapter_num, ch.title AS chapter_title,
         c.id AS comic_id, c.title AS comic_title, c.slug AS comic_slug
       FROM pages p
       JOIN chapters ch ON p.chapter_id = ch.id
       JOIN comics c ON p.comic_id = c.id
       WHERE ${comicWhere}
         AND ch.chapter_num = $2
         AND ch.is_published = true
         AND c.is_published = true
       ORDER BY p.page_num ASC`,
      [id, chNum]
    );

    if (result.rows.length === 0) {
      return Response.json({ success: false, error: 'Chapter not found' }, { status: 404 });
    }

    // Increment chapter view count
    const chapterId = result.rows[0].chapter_id;
    query(`UPDATE chapters SET view_count = view_count + 1 WHERE id = $1`, [chapterId]).catch(console.error);

    const firstRow = result.rows[0];

    return Response.json({
      success: true,
      data: {
        comic: {
          id: firstRow.comic_id,
          title: firstRow.comic_title,
          slug: firstRow.comic_slug,
        },
        chapter: {
          id: firstRow.chapter_id,
          chapter_num: parseFloat(firstRow.chapter_num),
          title: firstRow.chapter_title,
        },
        pages: result.rows.map((r) => ({
          id: r.id,
          page_num: r.page_num,
          image_url: r.image_url,
          width: r.width,
          height: r.height,
        })),
      },
    });
  } catch (error) {
    console.error('Get pages error:', error);
    return Response.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
