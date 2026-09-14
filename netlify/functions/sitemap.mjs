import { createClient } from '@supabase/supabase-js';
import { escapeXml, SITE_URL } from './lib/blog-html.mjs';

export default async function handler() {
  const headers = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' };
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return { statusCode: 500, headers, body: '<?xml version="1.0" encoding="UTF-8"?><error>Unavailable</error>' };
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await client.from('posts').select('slug,published_at').eq('status', 'published').order('published_at', { ascending: false });
  if (error) { console.error('Sitemap query failed', error.message); return { statusCode: 500, headers, body: '<?xml version="1.0" encoding="UTF-8"?><error>Unavailable</error>' }; }
  const staticUrls = ['/', '/pages/games.html', '/pages/membership.html', '/blog'];
  const urls = [...staticUrls.map(path => `<url><loc>${escapeXml(`${SITE_URL}${path}`)}</loc></url>`), ...(data || []).map(post => `<url><loc>${escapeXml(`${SITE_URL}/blog/${post.slug}`)}</loc><lastmod>${escapeXml(new Date(post.published_at).toISOString().slice(0, 10))}</lastmod></url>`)].join('');
  return { statusCode: 200, headers, body: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>` };
}
