import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const IMAGES_BASE_DIR = process.env.IMAGES_DIR || '/root/comics/images';

/**
 * Ensure a directory exists, create if not
 */
export async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Build the storage path for a page image
 * Structure: /root/comics/images/<comic_slug>/ch<chapter_num>/<page_num>.webp
 */
export function buildImagePath(
  comicSlug: string,
  chapterNum: number,
  pageNum: number,
  ext = 'webp'
): string {
  const chapterDir = `ch${String(chapterNum).padStart(4, '0')}`;
  return path.join(IMAGES_BASE_DIR, comicSlug, chapterDir, `${String(pageNum).padStart(4, '0')}.${ext}`);
}

/**
 * Build public URL for the image
 * Since images are stored on remote server /root/comics/images,
 * they are served via the Next.js API route /api/images/[...path]
 */
export function buildImageUrl(
  comicSlug: string,
  chapterNum: number,
  pageNum: number,
  ext = 'webp'
): string {
  const chapterDir = `ch${String(chapterNum).padStart(4, '0')}`;
  return `/api/images/${comicSlug}/${chapterDir}/${String(pageNum).padStart(4, '0')}.${ext}`;
}

/**
 * Save an image buffer to disk
 */
export async function saveImage(buffer: Buffer, filePath: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buffer);
}

/**
 * Delete an image file
 */
export async function deleteImage(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore if file not found
  }
}

/**
 * Slugify a title
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug (append uuid fragment if needed)
 */
export function uniqueSlug(base: string): string {
  const slug = slugify(base);
  return slug || uuidv4().substring(0, 8);
}
