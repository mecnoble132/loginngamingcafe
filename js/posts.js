import DOMPurify from 'https://esm.sh/dompurify@3.2.6';
import { supabase } from './supabase-config.js';

export const BLOG_TAGS = ['Announcement', 'Game Guides', 'Events', 'Cafe Life'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // storage bucket limit (after compression)
const MAX_INPUT_SIZE = 20 * 1024 * 1024; // what the admin may pick before compression
const MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;

export function slugify(title) {
  return String(title || '').trim().toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function isBlogImageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && /\.supabase\.co$/i.test(parsed.hostname)
      && parsed.pathname.includes('/storage/v1/object/public/blog-images/posts/');
  } catch { return false; }
}

export function sanitizePostHtml(html) {
  const clean = DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'strong', 'em', 'u', 'blockquote', 'ul', 'ol', 'li', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  doc.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!isSafeLink(href)) { link.removeAttribute('href'); return; }
    if (/^https:/i.test(href)) link.setAttribute('target', '_blank'), link.setAttribute('rel', 'noopener noreferrer');
  });
  doc.querySelectorAll('img').forEach(img => {
    if (!isBlogImageUrl(img.getAttribute('src') || '')) img.remove();
  });
  return doc.body.innerHTML;
}

function isSafeLink(value) {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

// Resize to at most MAX_DIMENSION px on the long side and re-encode as WebP (JPEG where the
// browser can't encode WebP). Keeps the original if compression wouldn't make it smaller.
async function compressImage(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { return file; }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const toBlob = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
  ctx.drawImage(bitmap, 0, 0, width, height);
  let blob = await toBlob('image/webp', IMAGE_QUALITY);
  if (!blob || blob.type !== 'image/webp') {
    // JPEG has no transparency: paint the site background behind the image first.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, width, height);
    blob = await toBlob('image/jpeg', IMAGE_QUALITY);
  }
  bitmap.close?.();
  if (!blob || (scale === 1 && blob.size >= file.size)) return file;
  return blob;
}

export async function uploadPostImage(file, postId) {
  if (!file || !IMAGE_TYPES.includes(file.type) || file.size > MAX_INPUT_SIZE) {
    throw new Error('Use a JPEG, PNG, or WebP image smaller than 20 MB.');
  }
  const image = await compressImage(file);
  if (image.size > MAX_IMAGE_SIZE) throw new Error('This image is still over 5 MB after compression. Try a smaller image.');
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[image.type];
  const path = `posts/${postId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('blog-images').upload(path, image, { contentType: image.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
  return data.publicUrl;
}
