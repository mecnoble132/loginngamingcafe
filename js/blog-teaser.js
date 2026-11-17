import { supabase } from './supabase-config.js';

const text = (tag, value, className) => { const el = document.createElement(tag); if (className) el.className = className; el.textContent = value; return el; };
const formatDate = date => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

function postCard(post) {
  const article = document.createElement('article'); article.className = 'latest-post-card reveal visible';
  const link = document.createElement('a'); link.className = 'latest-post-image'; link.href = `/blog/${encodeURIComponent(post.slug)}`;
  if (post.cover_image) { const image = document.createElement('img'); image.src = post.cover_image; image.alt = post.title; image.loading = 'lazy'; link.append(image); }
  const content = document.createElement('div'); content.className = 'latest-post-content';
  const meta = document.createElement('div'); meta.className = 'latest-post-meta'; meta.append(text('time', formatDate(post.published_at))); (post.tags || []).slice(0, 2).forEach(tag => meta.append(text('span', tag, 'latest-post-tag')));
  const title = text('h3', post.title); const titleLink = document.createElement('a'); titleLink.href = link.href; titleLink.textContent = post.title; title.textContent = ''; title.append(titleLink);
  content.append(meta, title, text('p', post.excerpt), Object.assign(document.createElement('a'), { href: link.href, className: 'latest-post-link', textContent: 'Read article →' })); article.append(link, content); return article;
}

export async function initBlogTeaser(gridId = 'latestPostsGrid') {
  const grid = document.getElementById(gridId); if (!grid) return;
  grid.replaceChildren(text('div', 'Loading latest posts…', 'latest-post-state'));
  const { data, error } = await supabase.from('posts').select('title,slug,cover_image,excerpt,tags,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(2);
  if (error) { grid.replaceChildren(text('div', 'Could not load posts right now. Please visit the blog shortly.', 'latest-post-state')); return; }
  if (!data?.length) { grid.replaceChildren(text('div', 'Fresh stories from Loginn are on the way.', 'latest-post-state')); return; }
  grid.replaceChildren(...data.map(postCard));
}
