import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Local-disk file store for uploaded images (project photos, unit type
 * photos, …). No cloud account needed — files land under apps/api/uploads/
 * and are served back by @fastify/static at the /uploads/ prefix (see
 * app.ts). Swap this module for an S3/R2 client later without touching any
 * caller: the public contract is just "give me a data URL, get back a path".
 */

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
const MAX_DECODED_BYTES = 6 * 1024 * 1024; // safety cap — the client-side cropper targets far less than this

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface StoredImage {
  /** Path to hand back to the client, e.g. "/uploads/projects/<id>/<uuid>.jpg" */
  url: string;
}

async function writeToUploads(category: string, buffer: Buffer, extension: string): Promise<StoredImage> {
  const relativePath = path.join(category, `${randomUUID()}.${extension}`);
  const absolutePath = path.join(UPLOADS_ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return { url: `/uploads/${relativePath.split(path.sep).join('/')}` };
}

/** `category` namespaces the file on disk, e.g. `projects/<projectId>` or `unit-types/<unitTypeId>`. */
export async function saveImage(category: string, dataUrl: string): Promise<StoredImage> {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('unsupported_image_format');
  }
  const mime = match[1] as string;
  const base64 = match[2] as string;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength > MAX_DECODED_BYTES) {
    throw new Error('image_too_large');
  }

  return writeToUploads(category, buffer, MIME_EXTENSIONS[mime] as string);
}

/** For server-generated binary files (e.g. rendered quotation PDFs) — not a data URL, already raw bytes. */
export async function saveBuffer(category: string, buffer: Buffer, extension: string): Promise<StoredImage> {
  if (buffer.byteLength > MAX_DECODED_BYTES) {
    throw new Error('file_too_large');
  }
  return writeToUploads(category, buffer, extension);
}

/** Best-effort delete — a missing file (already removed, or never existed) is not an error. */
export async function deleteImage(url: string): Promise<void> {
  if (!url.startsWith('/uploads/')) return;
  const relativePath = url.slice('/uploads/'.length);
  await unlink(path.join(UPLOADS_ROOT, relativePath)).catch(() => {});
}

/** "/uploads/projects/x/0.jpg" → its absolute path on disk; null for anything that isn't an
 * upload or that would escape the uploads folder. */
export function resolveUploadPath(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const absolutePath = path.resolve(UPLOADS_ROOT, url.slice('/uploads/'.length));
  return absolutePath.startsWith(UPLOADS_ROOT + path.sep) ? absolutePath : null;
}

export { UPLOADS_ROOT };
