/**
 * POST /api/comics/upload
 *
 * Submit comic pages to the platform.
 * Called by OpenClaw to upload generated comic content.
 *
 * Authentication: Bearer <API_KEY> in Authorization header
 *
 * Request: multipart/form-data
 * Fields:
 *   - comic_title    (required)  string  - e.g. "Dragon's Path"
 *   - comic_slug     (optional)  string  - auto-generated from title if omitted
 *   - chapter_num    (required)  number  - e.g. 1 or 1.5
 *   - chapter_title  (optional)  string
 *   - description    (optional)  string  - comic or chapter description
 *   - author         (optional)  string  - default: "OpenClaw"
 *   - genre          (optional)  string
 *   - tags           (optional)  string  - comma-separated
 *   - pages          (required)  File[]  - image files, named by page order or numbered
 *
 * Response:
 *   {
 *     success: true,
 *     comic: { id, title, slug },
 *     chapter: { id, chapter_num, page_count },
 *     pages: [{ page_num, image_url }]
 *   }
 */

import { NextRequest } from 'next/server';
import { validateApiKey, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';
import { buildImagePath, buildImageUrl, saveImage, uniqueSlug } from '@/lib/storage';

// Max file size: 20MB per page
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface PageEntry {
  pageNum: number;
  buffer: Buffer;
  mimeType: string;
  size: number;
  originalName: string;
}

async function parseMultipartForm(request: NextRequest): Promise<{
  fields: Record<string, string>;
  files: PageEntry[];
}> {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  const rawPages: { name: string; entry: PageEntry }[] = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      fields[key] = value;
    } else {
      // It's a File
      const file = value as File;

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type} for file ${file.name}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${file.name} (max 20MB)`);
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract page number from filename or use field key
      let pageNum = 0;
      const match = file.name.match(/(\d+)/);
      if (match) {
        pageNum = parseInt(match[1]);
      }

      rawPages.push({
        name: file.name,
        entry: {
          pageNum,
          buffer,
          mimeType: file.type,
          size: file.size,
          originalName: file.name,
        },
      });
    }
  }

  // Sort pages by page number, re-assign sequential numbers
  rawPages.sort((a, b) => a.entry.pageNum - b.entry.pageNum);
  const files = rawPages.map((item, index) => ({
    ...item.entry,
    pageNum: item.entry.pageNum > 0 ? item.entry.pageNum : index + 1,
  }));

  return { fields, files };
}

export async function POST(request: NextRequest) {
  // 1. Auth check
  const isValid = await validateApiKey(request);
  if (!isValid) {
    return unauthorized('Invalid or missing API key');
  }

  try {
    const { fields, files } = await parseMultipartForm(request);

    // 2. Validate required fields
    const comicTitle = fields.comic_title?.trim();
    if (!comicTitle) {
      return Response.json({ success: false, error: 'comic_title is required' }, { status: 400 });
    }

    const chapterNumRaw = parseFloat(fields.chapter_num || '');
    if (isNaN(chapterNumRaw) || chapterNumRaw <= 0) {
      return Response.json({ success: false, error: 'chapter_num must be a positive number' }, { status: 400 });
    }

    if (files.length === 0) {
      return Response.json({ success: false, error: 'At least one page image is required' }, { status: 400 });
    }

    // 3. Determine comic slug
    let slug = fields.comic_slug?.trim();
    if (!slug) {
      slug = uniqueSlug(comicTitle);
    }

    const author = fields.author?.trim() || 'OpenClaw';
    const genre = fields.genre?.trim() || null;
    const tags = fields.tags
      ? fields.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    const description = fields.description?.trim() || null;
    const chapterTitle = fields.chapter_title?.trim() || `Chapter ${chapterNumRaw}`;

    // 4. Upsert comic
    const comicResult = await query(
      `INSERT INTO comics (title, slug, description, author, genre, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         description = COALESCE(EXCLUDED.description, comics.description),
         author = EXCLUDED.author,
         genre = COALESCE(EXCLUDED.genre, comics.genre),
         tags = CASE WHEN array_length(EXCLUDED.tags, 1) > 0 THEN EXCLUDED.tags ELSE comics.tags END,
         updated_at = NOW()
       RETURNING id, title, slug`,
      [comicTitle, slug, description, author, genre, tags]
    );
    const comic = comicResult.rows[0];

    // 5. Upsert chapter
    const chapterResult = await query(
      `INSERT INTO chapters (comic_id, chapter_num, title, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (comic_id, chapter_num) DO UPDATE SET
         title = EXCLUDED.title,
         description = COALESCE(EXCLUDED.description, chapters.description),
         published_at = NOW()
       RETURNING id, chapter_num, title`,
      [comic.id, chapterNumRaw, chapterTitle, description]
    );
    const chapter = chapterResult.rows[0];

    // 6. Save pages
    const savedPages: { page_num: number; image_url: string }[] = [];
    const ext = 'webp';

    for (const page of files) {
      const imagePath = buildImagePath(slug, chapterNumRaw, page.pageNum, ext);
      const imageUrl = buildImageUrl(slug, chapterNumRaw, page.pageNum, ext);

      // Process image with sharp (convert to webp for consistency)
      let imageBuffer: Buffer;
      try {
        const sharp = (await import('sharp')).default;
        imageBuffer = await sharp(page.buffer)
          .webp({ quality: 85 })
          .toBuffer();
      } catch {
        // If sharp fails, save original
        imageBuffer = page.buffer;
      }

      await saveImage(imageBuffer, imagePath);

      // Get image dimensions
      let width = 0, height = 0;
      try {
        const sharp = (await import('sharp')).default;
        const meta = await sharp(imageBuffer).metadata();
        width = meta.width || 0;
        height = meta.height || 0;
      } catch {
        // ignore
      }

      // Upsert page record
      await query(
        `INSERT INTO pages (chapter_id, comic_id, page_num, image_url, image_path, width, height, file_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (chapter_id, page_num) DO UPDATE SET
           image_url = EXCLUDED.image_url,
           image_path = EXCLUDED.image_path,
           width = EXCLUDED.width,
           height = EXCLUDED.height,
           file_size = EXCLUDED.file_size`,
        [chapter.id, comic.id, page.pageNum, imageUrl, imagePath, width, height, imageBuffer.length]
      );

      savedPages.push({ page_num: page.pageNum, image_url: imageUrl });
    }

    // 7. Update cover_image if first chapter and no cover yet
    if (chapterNumRaw === 1 && savedPages.length > 0) {
      await query(
        `UPDATE comics SET cover_image = $1 WHERE id = $2 AND (cover_image IS NULL OR cover_image = '')`,
        [savedPages[0].image_url, comic.id]
      );
    }

    return Response.json({
      success: true,
      comic: {
        id: comic.id,
        title: comic.title,
        slug: comic.slug,
        url: `/comics/${comic.slug}`,
      },
      chapter: {
        id: chapter.id,
        chapter_num: parseFloat(chapter.chapter_num),
        title: chapter.title,
        page_count: savedPages.length,
      },
      pages: savedPages,
    }, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
