import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeXml, safeJson, sanitizePostHtml } from '../netlify/functions/lib/blog-html.mjs';

test('escapes HTML and XML values', () => {
  assert.equal(escapeHtml('<script>&'), '&lt;script&gt;&amp;');
  assert.equal(escapeXml('a&b'), 'a&amp;b');
});
test('JSON-LD cannot close its script tag', () => assert.ok(safeJson({ value: '</script>' }).includes('\\u003c/script>')));
test('post sanitizer rejects script, data images, and unsafe links', () => {
  const value = sanitizePostHtml('<p>Hi<script>x</script><a href="javascript:x">bad</a><img src="data:x">');
  assert.ok(!value.includes('script'));
  assert.ok(!value.includes('data:'));
});
test('blog index has an h1 and uses the www host', async () => {
  const { renderIndex, SITE_URL } = await import('../netlify/functions/lib/blog-html.mjs');
  assert.equal(SITE_URL, 'https://www.loginntvm.in');
  const html = renderIndex([], { page: 1, totalPages: 1 });
  assert.match(html, /<h1[^>]*>Loginn Gaming Cafe Blog<\/h1>/);
  assert.ok(html.includes('<link rel="canonical" href="https://www.loginntvm.in/blog">'));
});
test('unsafe or missing link href keeps the link text', () => {
  assert.equal(sanitizePostHtml('<p>See <a href="http://x.com">this site</a></p>'), '<p>See this site</p>');
  assert.equal(sanitizePostHtml('<p>See <a>our menu</a></p>'), '<p>See our menu</p>');
  assert.ok(sanitizePostHtml('<a href="https://wa.me/1">x</a>').includes('target="_blank"'));
});
