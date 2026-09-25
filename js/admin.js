/* ============================================================
   LOGINN GAMING CAFE — js/admin.js
   Admin dashboard: Games management
   Uses admin.css design system (modals, branded cards, toasts)
============================================================ */
'use strict';

import { supabase } from './supabase-config.js';
import { FALLBACK_GAMES } from './games.js';

// ── Row <-> UI shape mapping (Postgres uses snake_case) ──────
function gameToRow(g) {
  return {
    title: g.title,
    cover_id: g.coverId,
    genre: g.genre,
    color: g.color,
    tags: g.tags,
    platform: g.platform,
    ...(('featuredInCategory' in g) ? { featured_in_category: g.featuredInCategory } : {}),
  };
}
function rowToGame(r) {
  return {
    id: r.id, title: r.title, coverId: r.cover_id, genre: r.genre,
    color: r.color, tags: r.tags || [], platform: r.platform || [],
    featuredInCategory: r.featured_in_category || {},
  };
}
// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

function applyAuthState(session) {
  if (session && session.user) {
    loginScreen.style.display = 'none';
    dashboard.style.display = '';
    document.getElementById('adminEmail').textContent = session.user.email;
    initDashboard();
  } else {
    loginScreen.style.display = '';
    dashboard.style.display = 'none';
  }
}

// Check current session on load, then react to future changes
// (login, logout, token refresh) — replaces onAuthStateChanged.
supabase.auth.getSession().then(({ data }) => applyAuthState(data.session));
supabase.auth.onAuthStateChange((_event, session) => applyAuthState(session));

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    errEl.textContent = 'Invalid email or password.';
    errEl.style.display = '';
  }
});

document.getElementById('loginPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('logoutBtn').addEventListener('click', () => supabase.auth.signOut());

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
let dashboardInitialized = false;

function initDashboard() {
  if (dashboardInitialized) return;
  dashboardInitialized = true;
  listenGames();
  setupGameModal();
  setupRefresh();
  setupSeeding();
  setupFeaturedTab();
}

// ══════════════════════════════════════════════════════════
// GAMES
// ══════════════════════════════════════════════════════════

async function fetchGames() {
  const { data, error } = await supabase.from('games').select('*').order('title', { ascending: true });
  if (error) throw error;
  allGames = (data || []).map(rowToGame);
  renderGames();
  renderFeatured();
  updateStats();
}

function listenGames() {
  fetchGames().catch(err => {
    console.warn('Games error:', err.message);
    document.getElementById('gamesListPanel').innerHTML =
      '<div class="table-empty"><i class="fa-solid fa-triangle-exclamation"></i> Error loading games</div>';
  });

  // Realtime subscription — replaces Firestore's onSnapshot.
  supabase
    .channel('admin-games')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
      fetchGames().catch(err => console.warn('Games refresh error:', err.message));
    })
    .subscribe();
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
        const { error } = await supabase.from('games').update(gameToRow(data)).eq('id', editId);
        if (error) throw error;
        showToast(`"${title}" updated!`);
      } else {
        data.featuredInCategory = null;
        const { error } = await supabase.from('games').insert(gameToRow(data));
        if (error) throw error;
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
      return supabase.from('games').update({
        featured_in_category: Object.keys(merged).length ? merged : null
      }).eq('id', gid);
    });
    const results = await Promise.all(promises);
    const failed = results.find(r => r.error);
    if (failed) throw failed.error;
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
      await fetchGames();
      showToast(`Refreshed ${allGames.length} games.`);
    } catch (e) { showToast('Refresh failed: ' + e.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i><span class="hide-mobile">Refresh</span>';
    }
  };

  document.getElementById('refreshGamesBtn').addEventListener('click', refreshGames);
}

function setupSeeding() {
  document.getElementById('seedGamesBtn').addEventListener('click', async () => {
    if (!confirm("Add all fallback games to the database? This may create duplicates.")) return;
    const btn = document.getElementById('seedGamesBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
      const rows = FALLBACK_GAMES.map(gameToRow);
      const { error } = await supabase.from('games').insert(rows);
      if (error) throw error;
      showToast(`Successfully seeded ${FALLBACK_GAMES.length} games.`);
    } catch (e) { showToast('Seeding failed: ' + e.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-database"></i><span class="hide-mobile">Seed DB</span>';
    }
  });
}

// ══════════════════════════════════════════════════════════
// DELETE CONFIRMATION
// ══════════════════════════════════════════════════════════
function confirmDelete(tableName, rowId, label) {
  if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
  supabase.from(tableName).delete().eq('id', rowId)
    .then(({ error }) => {
      if (error) throw error;
      showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted.`);
    })
    .catch(e => showToast('Error: ' + e.message, 'error'));
}

// ══════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════
function updateStats() {
  document.getElementById('statGames').textContent = allGames.length;
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