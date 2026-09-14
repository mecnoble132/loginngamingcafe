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
