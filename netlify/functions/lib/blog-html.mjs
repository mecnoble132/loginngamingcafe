import sanitizeHtml from 'sanitize-html';

export const SITE_URL = 'https://loginntvm.in';
const allowedTags = ['p', 'br', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img'];

export function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function escapeXml(value = '') { return escapeHtml(value); }

export function safeJson(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }

export function sanitizePostHtml(html = '') {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    allowedSchemes: ['https'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || '';
        const internal = href.startsWith('/') && !href.startsWith('//');
        if (!internal && !href.startsWith('https://')) return { tagName: 'span', text: '' };
        return { tagName, attribs: { href, ...(href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {}) } };
      },
      img: (tagName, attribs) => isBlogImageUrl(attribs.src) ? { tagName, attribs: { src: attribs.src, alt: attribs.alt || '' } } : { tagName: 'span', text: '' },
    },
  });
}

export function isBlogImageUrl(url = '') {
  try {
    const value = new URL(url);
    return value.protocol === 'https:' && /\.supabase\.co$/i.test(value.hostname)
      && value.pathname.includes('/storage/v1/object/public/blog-images/posts/');
  } catch { return false; }
}

export function dateText(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function shell({ title, description, canonical, body, robots = 'index,follow', article = null }) {
  const ogImage = article?.cover_image ? `<meta property="og:image" content="${escapeHtml(article.cover_image)}">` : '';
  const articleMeta = article ? `
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(article.meta_description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${ogImage}
  <meta property="og:site_name" content="Loginn Gaming Cafe">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${safeJson({ '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.meta_description, image: article.cover_image, datePublished: article.published_at, author: { '@type': 'Organization', name: article.author_name }, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical } })}</script>` : `
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="Loginn Gaming Cafe">`;
  return `<!doctype html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${escapeHtml(canonical)}">${articleMeta}
  <link rel="icon" type="image/png" href="/loginnfavicon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Michroma&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"><link rel="stylesheet" href="/css/common.css"><link rel="stylesheet" href="/css/blog.css">
  </head><body>${header()}<main>${body}</main>${footer()}<a href="https://wa.me/918075707064" target="_blank" class="whatsapp-float" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a><script src="/js/common.js"></script></body></html>`;
}

function header() { return `<div id="page-loader" aria-hidden="true"><div class="loader-logo-wrap"><div class="loader-logo-icon"><img src="/images/loginnlogo.png" alt="Loginn logo"></div><div class="loader-logo-name">LOGINN<span>.</span></div></div><div class="loader-bar-track"><div class="loader-bar-fill"></div></div></div><nav id="navbar"><div class="nav-inner"><a href="/" class="nav-logo"><span class="logo-icon"><img src="/images/loginnlogo.png" alt="logo"></span><span class="logo-text">LOGINN<span class="accent-blue">.</span></span></a><ul class="nav-links" id="navLinks"><li><a href="/#pricing" class="nav-link">Stations &amp; Pricing</a></li><li><a href="/#find-us" class="nav-link">Contact</a></li><li><a href="/pages/games.html" class="nav-link">Games</a></li><li><a href="/pages/membership.html" class="nav-link">Membership</a></li><li><a href="/blog" class="nav-link">Blog</a></li><li><a href="/#gallery" class="nav-link">Gallery</a></li></ul><a href="tel:+918075707064" class="btn btn-primary nav-cta-btn nav-cta-desktop"><i class="fa-solid fa-phone"></i> Call to Book</a><a href="tel:+918075707064" class="btn btn-primary nav-cta-btn nav-cta-mobile"><i class="fa-solid fa-phone"></i> Call to Book</a><button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button></div></nav>`; }
function footer() { return `<footer class="main-footer"><div class="container footer-container"><div class="footer-col footer-brand"><a href="/" class="nav-logo"><span class="logo-icon"><img src="/images/loginnlogo.png" alt="logo"></span><span class="logo-text">LOGINN<span class="accent-blue">.</span></span></a><p class="footer-desc">Premium gaming PCs. Zero Lag. Ice-cold vibes.<br>Your ultimate gaming destination in Thiruvananthapuram.</p><div class="footer-socials"><a href="https://www.instagram.com/loginnkerala/" aria-label="Instagram" target="_blank"><i class="fa-brands fa-instagram"></i></a><a href="#" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a></div></div><div class="footer-col footer-links"><h4>Quick Links</h4><ul><li><a href="/#pricing">Stations &amp; Pricing</a></li><li><a href="/pages/games.html">Games Library</a></li><li><a href="/pages/membership.html">Membership</a></li><li><a href="/blog">Blog</a></li></ul></div><div class="footer-col footer-contact"><h4>Contact Us</h4><ul><li><i class="fa-solid fa-location-dot"></i><span>Loginn Gaming Centre<br>Toll Junction, Ambalamukku<br>Thiruvananthapuram, Kerala 695003</span></li><li><i class="fa-solid fa-phone"></i><span><a href="tel:+918075707064">+91 80757 07064</a></span></li><li><i class="fa-solid fa-clock"></i><span>Every Day: 11 AM – 11 PM</span></li></ul></div></div><div class="footer-bottom"><div class="container footer-bottom-inner"><span class="footer-copy">© 2026 Loginn. All rights reserved.</span></div></div></footer>`; }

function tags(tags = []) { return tags.filter(Boolean).map(tag => `<span class="blog-tag">${escapeHtml(tag)}</span>`).join(''); }

function postCard(post) {
  return `<article class="blog-card"><a href="/blog/${encodeURIComponent(post.slug)}" class="blog-card-image"><img src="${escapeHtml(post.cover_image || '')}" alt="${escapeHtml(post.title)}" loading="lazy"></a><div class="blog-card-content"><div class="blog-card-meta"><time datetime="${escapeHtml(post.published_at || '')}">${escapeHtml(dateText(post.published_at))}</time>${tags(post.tags)}</div><h2><a href="/blog/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.excerpt)}</p><a class="blog-read-link" href="/blog/${encodeURIComponent(post.slug)}">Read article <i class="fa-solid fa-arrow-right"></i></a></div></article>`;
}

export function renderIndex(posts) {
  const [featured, ...rest] = posts;
  const featuredCard = featured ? `<a href="/blog/${encodeURIComponent(featured.slug)}" class="blog-featured"><div class="blog-featured-image"><img src="${escapeHtml(featured.cover_image || '')}" alt="${escapeHtml(featured.title)}"></div><div class="blog-featured-content"><span class="blog-featured-label"><i class="fa-solid fa-star"></i> Featured story</span><div class="blog-card-meta"><time datetime="${escapeHtml(featured.published_at || '')}">${escapeHtml(dateText(featured.published_at))}</time>${tags(featured.tags)}</div><h2>${escapeHtml(featured.title)}</h2><p>${escapeHtml(featured.excerpt)}</p><span class="blog-read-link">Read article <i class="fa-solid fa-arrow-right"></i></span></div></a>` : '';
  const grid = rest.length ? `<div class="blog-list-label"><i class="fa-solid fa-layer-group"></i> More stories</div><div class="blog-grid">${rest.map(postCard).join('')}</div>` : '';
  const listBody = posts.length
    ? `${featuredCard}${grid}`
    : `<section class="blog-state"><i class="fa-solid fa-pen-nib"></i><h2>Stories are loading in</h2><p>There are no published posts yet. Check back soon for gaming guides, cafe updates, and event news.</p></section>`;
  const hero = `<div class="page-hero"><div class="container page-hero-inner"><div class="page-hero-tag"><i class="fa-solid fa-pen-nib"></i> BLOG</div><h1 class="page-hero-title">From <span class="accent-green">Loginn</span></h1><p class="page-hero-sub">Guides, game nights, and everything happening at Trivandrum’s premium gaming cafe.</p></div></div>`;
  return shell({ title: 'Blog | Loginn Gaming Cafe', description: 'Gaming guides, cafe stories, events, and updates from Loginn Gaming Cafe in Trivandrum.', canonical: `${SITE_URL}/blog`, body: `${hero}<section class="blog-list-section"><div class="container">${listBody}</div></section>` });
}

export function renderArticle(post, related = []) {
  const body = sanitizePostHtml(post.body_html);
  const authorName = (post.author_name || '').trim() || 'Loginn Gaming Cafe';
  const byline = `<div class="article-byline"><span class="article-author"><i class="fa-solid fa-circle-user"></i> ${escapeHtml(authorName)}</span><span class="article-byline-dot"></span><time datetime="${escapeHtml(post.published_at || '')}">${escapeHtml(dateText(post.published_at))}</time></div>`;
  const relatedSection = related.length ? `<section class="blog-related"><div class="container"><div class="blog-list-label"><i class="fa-solid fa-layer-group"></i> More from the blog</div><div class="blog-grid">${related.map(postCard).join('')}</div></div></section>` : '';
  return shell({ title: `${post.title} | Loginn Gaming Cafe`, description: post.meta_description, canonical: `${SITE_URL}/blog/${post.slug}`, article: post, body: `<article class="article"><div class="container article-container"><a href="/blog" class="blog-back"><i class="fa-solid fa-arrow-left"></i> All posts</a><header class="article-header"><div class="article-tags">${tags(post.tags)}</div><h1>${escapeHtml(post.title)}</h1><p class="article-excerpt">${escapeHtml(post.excerpt)}</p>${byline}</header>${post.cover_image ? `<img class="article-cover" src="${escapeHtml(post.cover_image)}" alt="${escapeHtml(post.title)}">` : ''}<div class="article-body">${body}</div><aside class="article-cta"><div><span>READY PLAYER ONE?</span><h2>Make your next game night legendary.</h2></div><a href="https://wa.me/918075707064?text=Hi!%20I%27d%20like%20to%20book%20a%20slot%20at%20Loginn" target="_blank" class="btn btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> Book a slot</a></aside></div></article>${relatedSection}` });
}

export function renderStatus(code, heading, message) { return shell({ title: `${code} | Loginn Gaming Cafe`, description: 'Loginn Gaming Cafe', canonical: `${SITE_URL}/blog`, robots: 'noindex,nofollow', body: `<section class="blog-state blog-status"><div class="container"><i class="fa-solid fa-gamepad"></i><p class="status-code">${code}</p><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p><a href="/blog" class="btn btn-primary">Browse the blog</a></div></section>` }); }
