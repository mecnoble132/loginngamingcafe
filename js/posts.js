import DOMPurify from 'https://esm.sh/dompurify@3.2.6';
import { supabase } from './supabase-config.js';

export const BLOG_TAGS = ['Announcement', 'Game Guides', 'Events', 'Cafe Life'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
    ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img'],
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

export async function uploadPostImage(file, postId) {
  if (!file || !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE) {
    throw new Error('Use a JPEG, PNG, or WebP image smaller than 5 MB.');
  }
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[file.type];
  const path = `posts/${postId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('blog-images').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
  return data.publicUrl;
}
