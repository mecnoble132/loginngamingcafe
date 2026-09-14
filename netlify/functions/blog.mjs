import { createClient } from '@supabase/supabase-js';
import { renderArticle, renderIndex, renderStatus } from './lib/blog-html.mjs';

const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' };
const response = (status, body) => new Response(body, { status, headers });

export default async function handler(request) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return response(500, renderStatus(500, 'Something went wrong', 'Please try again shortly.'));
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const rawPath = new URL(request.url).pathname.replace(/\/+$/, '') || '/blog';
  if (rawPath === '/blog' || rawPath.endsWith('/.netlify/functions/blog')) {
    const { data, error } = await client.from('posts').select('id,title,slug,cover_image,excerpt,tags,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(24);
    if (error) { console.error('Blog list query failed', error.message); return response(500, renderStatus(500, 'Something went wrong', 'Please try again shortly.')); }
    return response(200, renderIndex(data || []));
  }
  const segment = rawPath.replace(/^\/blog\//, '');
  let slug;
  try { slug = decodeURIComponent(segment); } catch { return response(404, renderStatus(404, 'Post not found', 'This post does not exist or is no longer published.')); }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return response(404, renderStatus(404, 'Post not found', 'This post does not exist or is no longer published.'));
  const { data, error } = await client.from('posts').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
  if (error) { console.error('Blog post query failed', error.message); return response(500, renderStatus(500, 'Something went wrong', 'Please try again shortly.')); }
  return data ? response(200, renderArticle(data)) : response(404, renderStatus(404, 'Post not found', 'This post does not exist or is no longer published.'));
}
