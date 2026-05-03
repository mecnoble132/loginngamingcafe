/* ============================================================
   LOGINN GAMING CAFE — js/admin.js
   Admin dashboard: Games & News/Events management
   Uses admin.css design system (modals, branded cards, toasts)
============================================================ */
'use strict';

import { db, auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, addDoc, deleteDoc, setDoc, serverTimestamp, getDocs, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { FALLBACK_GAMES } from './games.js';
import { FALLBACK_NEWS } from './news.js';

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = 'none';
    dashboard.style.display = '';
    document.getElementById('adminEmail').textContent = user.email;
    initDashboard();
  } else {
    loginScreen.style.display = '';
    dashboard.style.display = 'none';
  }
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    errEl.textContent = 'Invalid email or password.';
    errEl.style.display = '';
  }
});

document.getElementById('loginPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// ══════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ══════════════════════════════════════════════════════════
// TOAST SYSTEM
// ══════════════════════════════════════════════════════════
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ══════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ══════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════
let allGames = [];
let allNews = [];
let dashboardInitialized = false;

function initDashboard() {
  if (dashboardInitialized) return;
  dashboardInitialized = true;
  listenGames();
  listenNews();
  setupGameModal();
  setupNewsModal();
  setupRefresh();
  setupSeeding();
  setupFeaturedTab();
}

// ══════════════════════════════════════════════════════════
// GAMES
// ══════════════════════════════════════════════════════════

function listenGames() {
  onSnapshot(query(collection(db, 'games'), orderBy('title', 'asc')), snap => {
    allGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGames();
    renderFeatured();
    updateStats();
  }, err => {
    console.warn('Games error:', err.message);
    document.getElementById('gamesListPanel').innerHTML =
      '<div class="table-empty"><i class="fa-solid fa-triangle-exclamation"></i> Error loading games</div>';
  });
}

function renderGames(filter = '') {
  const el = document.getElementById('gamesListPanel');
  const q = filter.toLowerCase();
  const filtered = q
    ? allGames.filter(g =>
        g.title.toLowerCase().includes(q) ||
        (g.genre || '').toLowerCase().includes(q) ||
        (g.tags || []).some(t => t.toLowerCase().includes(q)))
    : allGames;

  if (!filtered.length) {
    el.innerHTML = `<div class="table-empty">${q ? 'No games match your search.' : 'No games yet. Click "Add Game" to start!'}</div>`;
    return;
  }

  el.innerHTML = filtered.map(g => {
    const coverUrl = g.coverId
      ? `https://images.igdb.com/igdb/image/upload/t_cover_small_2x/${g.coverId}.jpg`
      : null;
    const coverHtml = coverUrl
      ? `<div class="agc-cover"><img src="${coverUrl}" alt="${g.title}" onerror="this.parentElement.style.background='var(--bg-card)'"></div>`
      : `<div class="agc-cover" style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);"><i class="fa-solid fa-gamepad" style="color:var(--text-dim);font-size:1.1rem;"></i></div>`;

    const platforms = (g.platform || []).map(p =>
      `<span class="agc-platform ${p}">${p.toUpperCase()}</span>`
    ).join('');

    const featured = g.featuredInCategory
      ? Object.keys(g.featuredInCategory).filter(k => g.featuredInCategory[k])
      : [];
    const featuredHtml = featured.length
      ? `<span style="color:var(--pink);margin-left:4px;"><i class="fa-solid fa-star" style="font-size:0.55rem;"></i></span>`
      : '';

    return `
      <div class="admin-game-card" data-id="${g.id}">
        ${coverHtml}
        <div class="agc-info">
          <div class="agc-title">${g.title}${featuredHtml}</div>
          <div class="agc-meta">
            <span style="color:${g.color || 'var(--text-muted)'}"><i class="fa-solid fa-circle" style="font-size:0.4rem;vertical-align:middle;margin-right:3px;"></i>${g.genre || '—'}</span>
            ${platforms}
          </div>
        </div>
        <div class="agc-actions">
          <button class="action-btn action-edit game-edit" data-id="${g.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn action-delete game-delete" data-id="${g.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.game-edit').forEach(btn =>
    btn.addEventListener('click', () => editGame(btn.dataset.id))
  );
  el.querySelectorAll('.game-delete').forEach(btn =>
    btn.addEventListener('click', () => confirmDelete('games', btn.dataset.id, 'game'))
  );
}

// Search
document.getElementById('gameSearch')?.addEventListener('input', e => {
  renderGames(e.target.value);
});

// ── Game Modal ────────────────────────────────────────────
function setupGameModal() {
  document.getElementById('addGameBtn').addEventListener('click', () => {
    resetGameForm();
    document.getElementById('gameModalTitle').innerHTML =
      '<i class="fa-solid fa-gamepad" style="color:var(--blue)"></i> Add Game';
    openModal('gameModal');
  });

  document.getElementById('gameModalClose').addEventListener('click', () => closeModal('gameModal'));
  document.getElementById('gameModalCancel').addEventListener('click', () => closeModal('gameModal'));

  // Quick ID Finder & Auto-extraction
  const coverInput = document.getElementById('gameCoverId');
  const titleInput = document.getElementById('gameTitle');
  const searchLink = document.getElementById('searchIgdbLink');

  const updateSearchLink = () => {
    const title = titleInput.value.trim();
    if (title.length > 1) {
      searchLink.href = `https://www.igdb.com/search?q=${encodeURIComponent(title)}`;
      searchLink.style.display = 'inline-block';
    } else {
      searchLink.style.display = 'none';
    }
  };

  titleInput.addEventListener('input', updateSearchLink);

  coverInput.addEventListener('input', () => {
    const val = coverInput.value.trim();
    if (val.includes('igdb.com') && val.includes('/')) {
      const match = val.match(/\/([^\/.]+)\.(jpg|png|webp|jpeg)/i);
      if (match && match[1]) {
        const id = match[1].split('/').pop();
        coverInput.value = id;
        showToast('ID extracted from URL!', 'info');
      }
    }
  });

  document.getElementById('saveGameBtn').addEventListener('click', async () => {
    const title = document.getElementById('gameTitle').value.trim();
    if (!title) { showToast('Please enter a game title.', 'error'); return; }

    const data = {
      title,
      coverId: document.getElementById('gameCoverId').value.trim(),
      genre: document.getElementById('gameGenre').value.trim(),
      color: document.getElementById('gameColor').value || '#00d4ff',
      tags: document.getElementById('gameTags').value.split(',').map(t => t.trim()).filter(Boolean),
      platform: getChecked('gamePlatforms'),
    };

    const editId = document.getElementById('gameEditId').value;
    try {
      if (editId) {
        await updateDoc(doc(db, 'games', editId), data);
        showToast(`"${title}" updated!`);
      } else {
        data.featuredInCategory = null;
        await addDoc(collection(db, 'games'), data);
        showToast(`"${title}" added!`);
      }
      closeModal('gameModal');
    } catch (e) {
      showToast('Error saving game: ' + e.message, 'error');
    }
  });
}

function editGame(id) {
  const g = allGames.find(x => x.id === id);
  if (!g) return;
  document.getElementById('gameEditId').value = id;
  document.getElementById('gameTitle').value = g.title || '';
  document.getElementById('gameCoverId').value = g.coverId || '';
  document.getElementById('gameGenre').value = g.genre || '';
  document.getElementById('gameColor').value = g.color || '#00d4ff';
  document.getElementById('gameTags').value = (g.tags || []).join(', ');
  setChecked('gamePlatforms', g.platform || []);
  document.getElementById('gameModalTitle').innerHTML =
    '<i class="fa-solid fa-pen" style="color:var(--blue)"></i> Edit Game';
  
  // Update search link visibility immediately
  const titleInput = document.getElementById('gameTitle');
  const searchLink = document.getElementById('searchIgdbLink');
  if (titleInput.value.trim().length > 1) {
    searchLink.href = `https://www.igdb.com/search?q=${encodeURIComponent(titleInput.value.trim())}`;
    searchLink.style.display = 'inline-block';
  } else {
    searchLink.style.display = 'none';
  }

  openModal('gameModal');
}

function resetGameForm() {
  document.getElementById('gameEditId').value = '';
  document.getElementById('gameTitle').value = '';
  document.getElementById('gameCoverId').value = '';
  document.getElementById('gameGenre').value = '';
  document.getElementById('gameColor').value = '#00d4ff';
  document.getElementById('gameTags').value = '';
  clearChecked('gamePlatforms');
  document.getElementById('searchIgdbLink').style.display = 'none';
}

// ══════════════════════════════════════════════════════════
// NEWS / EVENTS
// ══════════════════════════════════════════════════════════

function listenNews() {
  onSnapshot(query(collection(db, 'news'), orderBy('createdAt', 'desc')), snap => {
    allNews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNews();
    updateStats();
  }, err => {
    console.warn('News error:', err.message);
    document.getElementById('newsListPanel').innerHTML =
      '<div class="table-empty"><i class="fa-solid fa-triangle-exclamation"></i> Error loading news</div>';
  });
}

function renderNews() {
  const el = document.getElementById('newsListPanel');
  if (!allNews.length) {
    el.innerHTML = '<div class="table-empty">No news/events yet. Click "Add Event" to start!</div>';
    return;
  }

  el.innerHTML = allNews.map(n => `
    <div class="admin-news-card" data-id="${n.id}">
      <div class="anc-top">
        <div>
          <span class="anc-tag ${n.tagColor || 'tag-blue'}">${n.tag || 'NEWS'}</span>
          <span class="anc-date">${n.date || ''}</span>
        </div>
        <div class="anc-actions">
          <button class="action-btn action-edit news-edit" data-id="${n.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn action-delete news-delete" data-id="${n.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="anc-title">${n.title}</div>
      <div class="anc-desc">${n.desc || ''}</div>
      <div class="anc-bottom">
        ${n.ctaText ? `<span class="anc-cta"><i class="fa-solid fa-link" style="font-size:0.6rem;margin-right:4px;"></i>${n.ctaText}</span>` : '<span></span>'}
      </div>
    </div>`
  ).join('');

  el.querySelectorAll('.news-edit').forEach(btn =>
    btn.addEventListener('click', () => editNews(btn.dataset.id))
  );
  el.querySelectorAll('.news-delete').forEach(btn =>
    btn.addEventListener('click', () => confirmDelete('news', btn.dataset.id, 'news item'))
  );
}

// ── News Modal ───────────────────────────────────────────
function setupNewsModal() {
  document.getElementById('addNewsBtn').addEventListener('click', () => {
    resetNewsForm();
    document.getElementById('newsModalTitle').innerHTML =
      '<i class="fa-solid fa-newspaper" style="color:var(--green)"></i> Add News / Event';
    openModal('newsModal');
  });

  document.getElementById('newsModalClose').addEventListener('click', () => closeModal('newsModal'));
  document.getElementById('newsModalCancel').addEventListener('click', () => closeModal('newsModal'));

  document.getElementById('saveNewsBtn').addEventListener('click', async () => {
    const title = document.getElementById('newsTitle').value.trim();
    if (!title) { showToast('Please enter a title.', 'error'); return; }

    const tagColor = document.querySelector('input[name="tagColor"]:checked')?.value || 'tag-blue';

    const data = {
      title,
      date: document.getElementById('newsDate').value.trim(),
      tag: document.getElementById('newsTag').value.trim().toUpperCase() || 'NEWS',
      tagColor,
      desc: document.getElementById('newsDesc').value.trim(),
      ctaText: document.getElementById('newsCtaText').value.trim(),
      ctaLink: document.getElementById('newsCtaLink').value.trim(),
    };

    const editId = document.getElementById('newsEditId').value;
    try {
      if (editId) {
        await updateDoc(doc(db, 'news', editId), data);
        showToast(`"${title}" updated!`);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'news'), data);
        showToast(`"${title}" added!`);
      }
      closeModal('newsModal');
    } catch (e) {
      showToast('Error saving: ' + e.message, 'error');
    }
  });
}

function editNews(id) {
  const n = allNews.find(x => x.id === id);
  if (!n) return;
  document.getElementById('newsEditId').value = id;
  document.getElementById('newsTitle').value = n.title || '';
  document.getElementById('newsDate').value = n.date || '';
  document.getElementById('newsTag').value = n.tag || '';
  document.getElementById('newsDesc').value = n.desc || '';
  document.getElementById('newsCtaText').value = n.ctaText || '';
  document.getElementById('newsCtaLink').value = n.ctaLink || '';
  // Set radio
  const radio = document.querySelector(`input[name="tagColor"][value="${n.tagColor || 'tag-blue'}"]`);
  if (radio) radio.checked = true;

  document.getElementById('newsModalTitle').innerHTML =
    '<i class="fa-solid fa-pen" style="color:var(--green)"></i> Edit News / Event';
  openModal('newsModal');
}

function resetNewsForm() {
  document.getElementById('newsEditId').value = '';
  document.getElementById('newsTitle').value = '';
  document.getElementById('newsDate').value = '';
  document.getElementById('newsTag').value = '';
  document.getElementById('newsDesc').value = '';
  document.getElementById('newsCtaText').value = '';
  document.getElementById('newsCtaLink').value = '';
  const radio = document.querySelector('input[name="tagColor"][value="tag-blue"]');
  if (radio) radio.checked = true;
}

// ══════════════════════════════════════════════════════════
// FEATURED GAMES
// ══════════════════════════════════════════════════════════
const FEATURED_CATEGORIES = ['all', 'pc', 'ps5', 'xbox', 'sim'];

function setupFeaturedTab() {
  document.getElementById('saveFeaturedBtn').addEventListener('click', saveFeatured);
}

function renderFeatured() {
  const panel = document.getElementById('featuredPanel');
  if (!allGames.length) {
    panel.innerHTML = '<div class="table-empty">Add some games first to manage featured selections.</div>';
    return;
  }

  panel.innerHTML = FEATURED_CATEGORIES.map(cat => {
    const label = cat === 'all' ? 'Homepage (All)' : cat.toUpperCase();
    const icon = { all: 'fa-house', pc: 'fa-computer', ps5: 'fa-playstation', xbox: 'fa-xbox', sim: 'fa-flag-checkered' }[cat];
    const iconBrand = ['ps5', 'xbox'].includes(cat) ? 'fa-brands' : 'fa-solid';

    // Filter games that have this platform (or all games for 'all')
    const eligible = cat === 'all'
      ? allGames
      : allGames.filter(g => (g.platform || []).includes(cat));

    const items = eligible.map(g => {
      const isFeatured = g.featuredInCategory && g.featuredInCategory[cat];
      return `
        <div class="featured-item">
          <input type="checkbox" class="featured-check" data-game-id="${g.id}" data-cat="${cat}"
            ${isFeatured ? 'checked' : ''}
            style="accent-color:var(--blue);width:18px;height:18px;">
          <span class="featured-item-title">${g.title}</span>
          <span style="font-size:0.65rem;color:var(--text-dim);">${(g.platform || []).join(', ').toUpperCase()}</span>
        </div>`;
    }).join('');

    return `
      <details class="featured-section" style="margin-bottom:16px;" ${cat === 'all' ? 'open' : ''}>
        <summary class="featured-cat-header" style="cursor:pointer; user-select:none; list-style:none;">
          <style>summary::-webkit-details-marker { display:none; }</style>
          <div class="featured-cat-title"><i class="${iconBrand} ${icon}" style="font-size:0.9rem;"></i> ${label}</div>
          <div class="featured-cat-count" data-cat-label="${cat}">${eligible.filter(g => g.featuredInCategory && g.featuredInCategory[cat]).length} selected <i class="fa-solid fa-caret-down" style="margin-left:6px; opacity:0.6;"></i></div>
        </summary>
        <div class="featured-list-wrap">
          <div class="featured-list">${items || '<div class="featured-empty">No eligible games for this category</div>'}</div>
        </div>
      </details>`;
  }).join('');

  // Enforce 5-game limit
  panel.querySelectorAll('.featured-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const cat = cb.dataset.cat;
      const checkedInCat = panel.querySelectorAll(`.featured-check[data-cat="${cat}"]:checked`);
      if (checkedInCat.length > 5) {
        cb.checked = false;
        showToast('Maximum 5 games can be featured per category.', 'error');
        return;
      }
      // Update count label
      const countEl = panel.querySelector(`.featured-cat-count[data-cat-label="${cat}"]`);
      if (countEl) {
        countEl.innerHTML = `${panel.querySelectorAll(`.featured-check[data-cat="${cat}"]:checked`).length} selected <i class="fa-solid fa-caret-down" style="margin-left:6px; opacity:0.6;"></i>`;
      }
    });
  });
}

async function saveFeatured() {
  const checks = document.querySelectorAll('.featured-check');
  // Build map: gameId → { cat: true/false }
  const map = {};
  checks.forEach(cb => {
    const gid = cb.dataset.gameId;
    const cat = cb.dataset.cat;
    if (!map[gid]) map[gid] = {};
    map[gid][cat] = cb.checked;
  });

  try {
    const promises = Object.entries(map).map(([gid, cats]) => {
      // Merge with existing — only update changed categories
      const game = allGames.find(g => g.id === gid);
      const existing = game?.featuredInCategory || {};
      const merged = { ...existing, ...cats };
      // Clean: remove false keys
      Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k]; });
      return updateDoc(doc(db, 'games', gid), {
        featuredInCategory: Object.keys(merged).length ? merged : null
      });
    });
    await Promise.all(promises);
    showToast('Featured games saved!');
  } catch (e) {
    showToast('Error saving featured: ' + e.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
// REFRESH & SEEDING
// ══════════════════════════════════════════════════════════
function setupRefresh() {
  const refreshGames = async () => {
    const btn = document.getElementById('refreshGamesBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
      const snap = await getDocs(query(collection(db, 'games'), orderBy('title', 'asc')));
      allGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderGames();
      renderFeatured();
      updateStats();
      showToast(`Refreshed ${allGames.length} games.`);
    } catch (e) { showToast('Refresh failed: ' + e.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i><span class="hide-mobile">Refresh</span>';
    }
  };

  const refreshNews = async () => {
    const btn = document.getElementById('refreshNewsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
      const snap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc')));
      allNews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderNews();
      updateStats();
      showToast(`Refreshed ${allNews.length} news items.`);
    } catch (e) { showToast('Refresh failed: ' + e.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i><span class="hide-mobile">Refresh</span>';
    }
  };

  document.getElementById('refreshGamesBtn').addEventListener('click', refreshGames);
  document.getElementById('refreshNewsBtn').addEventListener('click', refreshNews);
}

function setupSeeding() {
  document.getElementById('seedGamesBtn').addEventListener('click', async () => {
    if (!confirm("Add all fallback games to the database? This may create duplicates.")) return;
    const btn = document.getElementById('seedGamesBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
      const batch = writeBatch(db);
      FALLBACK_GAMES.forEach(g => {
        const ref = doc(collection(db, 'games'));
        batch.set(ref, g);
      });
      await batch.commit();
      showToast(`Successfully seeded ${FALLBACK_GAMES.length} games.`);
    } catch (e) { showToast('Seeding failed: ' + e.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-database"></i><span class="hide-mobile">Seed DB</span>';
    }
  });

  document.getElementById('seedNewsBtn').addEventListener('click', async () => {
    if (!confirm("Add fallback news to the database?")) return;
    const btn = document.getElementById('seedNewsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
      const batch = writeBatch(db);
      FALLBACK_NEWS.forEach(n => {
        const ref = doc(collection(db, 'news'));
        batch.set(ref, { ...n, createdAt: serverTimestamp() });
      });
      await batch.commit();
      showToast(`Successfully seeded ${FALLBACK_NEWS.length} news items.`);
    } catch (e) { showToast('Seeding failed: ' + e.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-database"></i><span class="hide-mobile">Seed</span>';
    }
  });
}

// ══════════════════════════════════════════════════════════
// DELETE CONFIRMATION
// ══════════════════════════════════════════════════════════
function confirmDelete(collectionName, docId, label) {
  if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
  deleteDoc(doc(db, collectionName, docId))
    .then(() => showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted.`))
    .catch(e => showToast('Error: ' + e.message, 'error'));
}

// ══════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════
function updateStats() {
  document.getElementById('statGames').textContent = allGames.length;
  document.getElementById('statNews').textContent = allNews.length;
  const featured = allGames.filter(g =>
    g.featuredInCategory && Object.values(g.featuredInCategory).some(Boolean)
  ).length;
  document.getElementById('statFeatured').textContent = featured;
}

// ══════════════════════════════════════════════════════════
// CHECKBOX HELPERS
// ══════════════════════════════════════════════════════════
function getChecked(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`))
    .map(cb => cb.value);
}

function setChecked(containerId, values) {
  document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach(cb => {
    cb.checked = values.includes(cb.value);
  });
}

function clearChecked(containerId) {
  document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach(cb => cb.checked = false);
}