/**
 * GET /api/images/[...path]
 * Serve images from the filesystem storage directory
 * This proxies images stored at /root/comics/images/
 */

import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const IMAGES_BASE_DIR = process.env.IMAGES_DIR || '/root/comics/images';

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  // Security: prevent path traversal
  const sanitized = pathSegments.map((seg) => seg.replace(/\.\./g, ''));
  const relativePath = sanitized.join('/');
  const fullPath = path.join(IMAGES_BASE_DIR, relativePath);

  // Ensure the resolved path is still within the base dir
  if (!fullPath.startsWith(IMAGES_BASE_DIR)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(buffer.length),
      },
    });
  } catch {
    return new Response('Image not found', { status: 404 });
  }
}
