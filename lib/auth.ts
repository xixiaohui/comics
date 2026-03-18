import { createHash } from 'crypto';
import { query } from './db';
import { NextRequest } from 'next/server';

/**
 * Validate API key from request header
 * Expects: Authorization: Bearer <api_key>
 */
export async function validateApiKey(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const apiKey = authHeader.substring(7).trim();
  if (!apiKey) return false;

  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  try {
    const result = await query(
      `SELECT id FROM api_keys WHERE key_hash = $1 AND is_active = true`,
      [keyHash]
    );

    if (result.rows.length > 0) {
      // Update last_used_at asynchronously
      query(
        `UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1`,
        [keyHash]
      ).catch(console.error);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Auth validation error:', err);
    return false;
  }
}

export function unauthorized(message = 'Unauthorized') {
  return Response.json({ success: false, error: message }, { status: 401 });
}
