import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const FALLBACK_NEWS = [
  { date: 'March 12, 2026', tag: 'NEW GAMES', tagColor: 'tag-blue', title: 'Avatar & High on Life 2 Added!', desc: "We've just updated our library with the latest hits. Avatar: Frontiers of Pandora and High on Life 2 are now available to play and review!", ctaText: 'Go to Review Page', ctaLink: 'gamepass.html' },
  { date: 'March 8, 2026', tag: 'ANNOUNCEMENT', tagColor: 'tag-green', title: 'Review a Game Programme Updated', desc: "Great news for all members! The 'Review a Game' perk is now available for all membership tiers, including Starter.", ctaText: 'View Membership Perks', ctaLink: 'membership.html' },
  { date: 'February 20, 2026', tag: 'NEW GEAR', tagColor: 'tag-blue', title: 'Performance PC Upgrade Complete', desc: "RTX 3060 now runs at full potential with updated drivers and cooling. Framerates are noticeably smoother.", ctaText: 'See updated specs', ctaLink: '../index.html#pricing' },
];

async function loadNewsData() {
  try {
    const snap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc')));
    if (snap.empty) return FALLBACK_NEWS;
    return snap.docs.map(d => d.data());
  } catch (e) {
    console.warn('News load fallback:', e.message);
    return FALLBACK_NEWS;
  }
}

function resolveLink(link, isTeaser) {
  if (!link || link === '#') return '#';
  if (link.startsWith('http')) return link;
  
  if (isTeaser) {
    // index.html context
    if (link === '../index.html' || link.startsWith('../index.html')) {
      return link.replace('../', '');
    }
    if (!link.startsWith('pages/') && !link.startsWith('index.html')) {
      return 'pages/' + link;
    }
  } else {
    // pages/news.html context
    if (link.startsWith('pages/')) {
      return link.replace('pages/', '');
    }
  }
  return link;
}

export async function initNews(containerId, isTeaser = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const items = await loadNewsData();
  const displayItems = isTeaser ? items.slice(0, 2) : items; // Show top 2 for teaser

  if (displayItems.length === 0) {
    container.innerHTML = '<div class="news-loading">No news yet. Check back soon!</div>';
    return;
  }

  if (isTeaser) {
    container.innerHTML = displayItems.map(n => `
      <div class="whats-on-card reveal">
        <div class="whats-on-label ${n.tagColor || 'tag-blue'}">${n.tag || 'NEWS'}</div>
        <div class="whats-on-date"><i class="fa-regular fa-calendar"></i> ${n.date}</div>
        <h3 class="whats-on-title">${n.title}</h3>
        <p class="whats-on-desc">${n.desc}</p>
        ${n.ctaText ? `<a href="${resolveLink(n.ctaLink, true)}" class="whats-on-cta">${n.ctaText} <i class="fa-solid fa-arrow-right"></i></a>` : ''}
      </div>
    `).join('');
  } else {
    container.innerHTML = displayItems.map(n => `
      <div class="news-card reveal">
        <div class="news-date"><i class="fa-regular fa-calendar"></i> ${n.date}</div>
        <div class="news-tag ${n.tagColor || 'tag-blue'}">${n.tag || 'NEWS'}</div>
        <h3 class="news-title">${n.title}</h3>
        <p class="news-desc">${n.desc}</p>
        ${n.ctaText ? `<a href="${resolveLink(n.ctaLink, false)}" class="news-cta">${n.ctaText} <i class="fa-solid fa-arrow-right"></i></a>` : ''}
      </div>
    `).join('');
  }

  document.querySelectorAll(`#${containerId} .reveal`).forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), i * 80);
  });
}
