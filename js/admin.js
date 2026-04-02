/* ============================================================
   LOGINN GAMING CAFE — js/admin.js
   Admin dashboard: Games CRUD + News/Events CRUD
============================================================ */
'use strict';

import { db, auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, addDoc, deleteDoc, setDoc,
  serverTimestamp, getDocs, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── SEED DATA (hardcoded games for one-time seed) ─────────
const SEED_GAMES = [
  { title: 'Valorant', coverId: 'cobqao', platform: ['pc', 'ps5', 'xbox'], genre: 'Tactical Shooter', tags: ['Competitive', 'Team', 'FPS'], color: '#ff4655', featuredInCategory: { all: true, pc: true } },
  { title: 'PUBG PC', coverId: 'coaam4', platform: ['pc'], genre: 'Battle Royale', tags: ['Battle Royale', 'Solo', 'Squad'], color: '#f5a623', featuredInCategory: { pc: true } },
  { title: 'Counter-Strike 2', coverId: 'coaczd', platform: ['pc'], genre: 'Tactical Shooter', tags: ['Competitive', 'Team', 'FPS'], color: '#f0a500', featuredInCategory: { pc: true } },
  { title: 'Dota 2', coverId: 'cobfk4', platform: ['pc'], genre: 'MOBA', tags: ['Strategy', 'Team', 'MOBA'], color: '#c23c2a', featuredInCategory: { pc: true } },
  { title: 'Rainbow Six Siege', coverId: 'co9yqs', platform: ['pc', 'ps5', 'xbox'], genre: 'Tactical Shooter', tags: ['Competitive', 'Team', 'FPS'], color: '#1a9cff', featuredInCategory: { pc: true } },
  { title: 'The Finals', coverId: 'coagj6', platform: ['pc', 'ps5', 'xbox'], genre: 'Battle Royale', tags: ['Competitive', 'Team', 'FPS'], color: '#ff6b35' },
  { title: 'Apex Legends', coverId: 'coa93z', platform: ['pc', 'ps5', 'xbox'], genre: 'Battle Royale', tags: ['Battle Royale', 'Team', 'FPS'], color: '#cd3333', featuredInCategory: { all: true, xbox: true } },
  { title: 'EA FC 26', coverId: 'coa5wx', platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a', featuredInCategory: { all: true, ps5: true } },
  { title: 'EA FC 25', coverId: 'coa755', platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a', featuredInCategory: { xbox: true } },
  { title: 'EA FC 24', coverId: 'co6qqa', platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'FIFA 23', coverId: 'co4zw5', platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'FIFA 22', coverId: 'co3dsm', platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'FIFA 21', coverId: 'co2t8z', platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'FIFA 19', coverId: 'co68bt', platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Classics'], color: '#00d46a' },
  { title: 'eFootball', coverId: 'co3h8g', platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Free-to-Play'], color: '#00d46a' },
  { title: 'WWE 2K25', coverId: 'co9c1v', platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['Wrestling', 'Multiplayer'], color: '#e8c84a', featuredInCategory: { xbox: true } },
  { title: 'WWE 2K24', coverId: 'co7nta', platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['Wrestling', 'Multiplayer'], color: '#e8c84a' },
  { title: 'UFC 5', coverId: 'co71e9', platform: ['ps5', 'xbox'], genre: 'Fighting', tags: ['MMA', '1v1'], color: '#ff4500' },
  { title: 'F1 25', coverId: 'co9mk6', platform: ['ps5', 'xbox', 'pc'], genre: 'Racing', tags: ['Formula 1', 'Sim', 'Solo'], color: '#e10600' },
  { title: 'F1 24', coverId: 'co845w', platform: ['ps5', 'xbox', 'pc'], genre: 'Racing', tags: ['Formula 1', 'Sim', 'Solo'], color: '#e10600' },
  { title: 'Dirt 5', coverId: 'co2e5b', platform: ['ps5', 'xbox', 'pc'], genre: 'Racing', tags: ['Offroad', 'Arcade'], color: '#e65c00' },
  { title: 'Mortal Kombat 1', coverId: 'co9b8f', platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['1v1', 'Arcade', 'Brutal'], color: '#b91c1c', featuredInCategory: { ps5: true } },
  { title: 'Mortal Kombat 11', coverId: 'co7d9e', platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['1v1', 'Arcade', 'Brutal'], color: '#b91c1c' },
  { title: 'Street Fighter V', coverId: 'co1pka', platform: ['ps5', 'pc'], genre: 'Fighting', tags: ['1v1', 'Arcade'], color: '#ff6600' },
  { title: 'Injustice 2', coverId: 'co1xym', platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['1v1', 'DC', 'Arcade'], color: '#4a90d9' },
  { title: 'It Takes Two', coverId: 'cob22v', platform: ['ps5', 'xbox', 'pc'], genre: 'Co-op', tags: ['Co-op', 'Story', '2 Players'], color: '#f72585' },
  { title: 'A Way Out', coverId: 'co1vca', platform: ['ps5', 'xbox', 'pc'], genre: 'Co-op', tags: ['Co-op', 'Story', '2 Players'], color: '#7b2d8b' },
  { title: 'Biped', coverId: 'co62i1', platform: ['ps5', 'xbox', 'pc'], genre: 'Co-op', tags: ['Co-op', 'Casual', '2 Players'], color: '#06b6d4' },
  { title: 'Chained Together', coverId: 'coaazz', platform: ['pc'], genre: 'Co-op', tags: ['Co-op', 'Platformer', 'Chaos'], color: '#a855f7' },
  { title: 'Stick Fight', coverId: 'co86z5', platform: ['pc'], genre: 'Party', tags: ['Party', 'Casual', '4 Players'], color: '#84cc16' },
  { title: 'Road Redemption', coverId: 'co2hlo', platform: ['ps5', 'xbox', 'pc'], genre: 'Action', tags: ['Racing', 'Combat', 'Chaos'], color: '#dc2626' },
  { title: 'CarX Street', coverId: 'coa75a', platform: ['ps5', 'xbox', 'pc'], genre: 'Racing', tags: ['Street', 'Drift', 'Open World'], color: '#f97316' },
  { title: 'Call of Duty Series', coverId: 'co7ctx', platform: ['ps5', 'xbox', 'pc'], genre: 'FPS', tags: ['FPS', 'Multiplayer', 'Action'], color: '#78716c', featuredInCategory: { all: true, xbox: true } },
  { title: 'Horizon Zero Dawn', coverId: 'co2una', platform: ['ps5', 'pc'], genre: 'RPG', tags: ['Open World', 'Story', 'Solo'], color: '#f59e0b' },
  { title: 'Ghost of Tsushima', coverId: 'co2crj', platform: ['ps5', 'pc'], genre: 'Action', tags: ['Open World', 'Story', 'Samurai'], color: '#e11d48', featuredInCategory: { ps5: true } },
  { title: 'The Last of Us Part II', coverId: 'co5ziw', platform: ['ps5', 'pc'], genre: 'Adventure', tags: ['Story', 'Survival', 'Emotional'], color: '#22c55e', featuredInCategory: { ps5: true } },
  { title: 'The Last of Us Part I', coverId: 'coa1gq', platform: ['ps5', 'pc'], genre: 'Adventure', tags: ['Story', 'Survival', 'Classic'], color: '#16a34a' },
  { title: 'Uncharted Series', coverId: 'co1r7h', platform: ['ps5', 'pc'], genre: 'Adventure', tags: ['Action', 'Story', 'Multiplayer'], color: '#d97706' },
  { title: 'Spider-Man 2', coverId: 'co2nc6', platform: ['ps5', 'pc'], genre: 'Action', tags: ['Open World', 'Story', 'Marvel'], color: '#ef4444', featuredInCategory: { ps5: true } },
  { title: 'Spider-Man: Miles Morales', coverId: 'cobg1j', platform: ['ps5', 'pc'], genre: 'Action', tags: ['Open World', 'Story', 'Marvel'], color: '#a855f7' },
  { title: 'Gran Turismo 7', coverId: 'co2g84', platform: ['ps5', 'sim'], genre: 'Racing Sim', tags: ['Sim', 'Cars', 'Realistic'], color: '#fbbf24', featuredInCategory: { sim: true } },
  { title: 'Assetto Corsa Competizione', coverId: 'co790d', platform: ['pc', 'ps5', 'xbox', 'sim'], genre: 'Racing Sim', tags: ['Sim', 'GT', 'Hardcore'], color: '#22d3ee', featuredInCategory: { all: true, sim: true } },
  { title: 'WRC Generations', coverId: 'co4rp1', platform: ['pc', 'ps5', 'xbox', 'sim'], genre: 'Racing Sim', tags: ['Rally', 'Sim', 'Offroad'], color: '#a3e635', featuredInCategory: { sim: true } },
  { title: 'Euro Truck Simulator', coverId: 'co8io1', platform: ['pc', 'sim'], genre: 'Simulation', tags: ['Relaxing', 'Sim', 'Open World'], color: '#60a5fa', featuredInCategory: { sim: true } },
  { title: 'Forza Horizon 5', coverId: 'co45k9', platform: ['pc', 'xbox', 'sim'], genre: 'Racing', tags: ['Arcade', 'Open World', 'Cars'], color: '#fb923c', featuredInCategory: { xbox: true, sim: true } },
];

// ── AUTH ───────────────────────────────────────────────────
const loginScreen = document.getElementById('loginScreen');
const dashboard   = document.getElementById('dashboard');

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = 'none';
    dashboard.style.display   = '';
    document.getElementById('adminEmail').textContent = user.email;
    initDashboard();
  } else {
    loginScreen.style.display = '';
    dashboard.style.display   = 'none';
  }
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    errEl.textContent    = 'Invalid email or password.';
    errEl.style.display  = '';
  }
});

document.getElementById('loginPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const iconMap = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${iconMap[type] || iconMap.info}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ── CONFIRM DIALOG ────────────────────────────────────────
function confirmDialog(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-card">
        <h3>Confirm</h3>
        <p>${msg}</p>
        <div class="confirm-btns">
          <button class="btn btn-ghost" id="confirmNo">Cancel</button>
          <button class="btn btn-primary" id="confirmYes">Yes, Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmYes').addEventListener('click', () => { overlay.remove(); resolve(true); });
    overlay.querySelector('#confirmNo').addEventListener('click', () => { overlay.remove(); resolve(false); });
  });
}

// ── TABS ──────────────────────────────────────────────────
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── DASHBOARD INIT ────────────────────────────────────────
let allGames = [];
let allNews  = [];

function initDashboard() {
  listenGames();
  listenNews();
  setupGameForm();
  setupNewsForm();
  setupFeatureForm();
  setupSeedSync();
  setupGameSearch();
}

// ══════════════════════════════════════════════════════════
// GAMES
// ══════════════════════════════════════════════════════════

function listenGames() {
  const q = query(collection(db, 'games'), orderBy('title', 'asc'));
  onSnapshot(q, snap => {
    allGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGames();
    document.getElementById('statGames').textContent = allGames.length;
    renderFeaturedTabs();
  }, err => {
    console.warn('Games listen error:', err.message);
    document.getElementById('gamesList').innerHTML = '<div class="table-empty">Could not load games.</div>';
  });
}

function renderGames(filter = '') {
  const el = document.getElementById('gamesList');
  const q = filter.toLowerCase().trim();
  const list = q
    ? allGames.filter(g => g.title.toLowerCase().includes(q) || (g.genre || '').toLowerCase().includes(q))
    : allGames;

  if (!list.length) {
    el.innerHTML = `<div class="table-empty">${q ? 'No games match your search.' : 'No games yet. Use "Seed Games" to load the default library.'}</div>`;
    return;
  }

  el.innerHTML = list.map(g => {
    const coverUrl = g.coverId
      ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.coverId}.jpg`
      : '';
    const platforms = (g.platform || []).map(p =>
      `<span class="agc-platform ${p}">${p.toUpperCase()}</span>`).join('');

    return `
      <div class="admin-game-card" data-id="${g.id}">
        <div class="agc-cover">
          ${coverUrl ? `<img src="${coverUrl}" alt="${g.title}" loading="lazy" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="agc-info">
          <div class="agc-title">${g.title}</div>
          <div class="agc-meta">
            ${platforms}
            <span>${g.genre || ''}</span>
          </div>
        </div>
        <div class="agc-actions">
          <button class="action-btn action-edit" data-id="${g.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn action-delete" data-id="${g.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');

  // Bind actions
  el.querySelectorAll('.action-edit').forEach(btn => {
    btn.addEventListener('click', () => openGameModal(allGames.find(g => g.id === btn.dataset.id)));
  });
  el.querySelectorAll('.action-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const game = allGames.find(g => g.id === btn.dataset.id);
      const ok = await confirmDialog(`Delete "${game?.title}"? This cannot be undone.`);
      if (ok) {
        await deleteDoc(doc(db, 'games', btn.dataset.id));
        showToast(`"${game?.title}" deleted`, 'info');
      }
    });
  });
}

// ── GAME SEARCH ───────────────────────────────────────────
function setupGameSearch() {
  const input = document.getElementById('gameSearchAdmin');
  input.addEventListener('input', () => renderGames(input.value));
}

// ── GAME MODAL ────────────────────────────────────────────
const gameModal     = document.getElementById('gameModal');
const gameEditId    = document.getElementById('gameEditId');

function openGameModal(game = null) {
  document.getElementById('gameModalTitle').textContent = game ? 'Edit Game' : 'Add Game';
  gameEditId.value = game?.id || '';
  document.getElementById('gfTitle').value = game?.title || '';
  document.getElementById('gfCoverId').value = game?.coverId || '';
  document.getElementById('gfColor').value = game?.color || '#00d4ff';
  document.getElementById('gfGenre').value = game?.genre || '';
  document.getElementById('gfTags').value = (game?.tags || []).join(', ');
  document.getElementById('gfFeatured').checked = game?.isFeatured || false;

  // Platforms
  document.querySelectorAll('#gfPlatform input[type="checkbox"]').forEach(cb => {
    cb.checked = (game?.platform || []).includes(cb.value);
  });

  gameModal.classList.add('open');
}

function closeGameModal() {
  gameModal.classList.remove('open');
}

function setupGameForm() {
  document.getElementById('addGameBtn').addEventListener('click', () => openGameModal());
  document.getElementById('gameModalClose').addEventListener('click', closeGameModal);
  document.getElementById('gameModalCancel').addEventListener('click', closeGameModal);

  gameModal.addEventListener('click', e => { if (e.target === gameModal) closeGameModal(); });

  document.getElementById('gameModalSave').addEventListener('click', async () => {
    const title = document.getElementById('gfTitle').value.trim();
    const coverId = document.getElementById('gfCoverId').value.trim();
    const color = document.getElementById('gfColor').value;
    const genre = document.getElementById('gfGenre').value.trim();
    const tags = document.getElementById('gfTags').value.split(',').map(t => t.trim()).filter(Boolean);
    const platform = [...document.querySelectorAll('#gfPlatform input[type="checkbox"]:checked')].map(c => c.value);
    const isFeatured = document.getElementById('gfFeatured').checked;

    const editId = gameEditId.value;

    if (!title) { showToast('Title is required', 'error'); return; }
    if (!platform.length) { showToast('Select at least one platform', 'error'); return; }
    if (!genre) { showToast('Genre is required', 'error'); return; }

    // Enforce max 5 featured games
    if (isFeatured) {
      const currentFeatured = allGames.filter(g => g.isFeatured && g.id !== editId).length;
      if (currentFeatured >= 5) {
        showToast('Max 5 featured games allowed. Unfeature another game first.', 'error');
        return;
      }
    }

    const data = { title, coverId, color, genre, tags, platform, isFeatured, updatedAt: serverTimestamp() };

    try {
      if (editId) {
        await updateDoc(doc(db, 'games', editId), data);
        showToast(`"${title}" updated`);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'games'), data);
        showToast(`"${title}" added`);
      }
      closeGameModal();
    } catch (err) {
      console.error('Game save error:', err);
      showToast('Failed to save game', 'error');
    }
  });
}

// ── SEED & SYNC ───────────────────────────────────────────
function setupSeedSync() {
  document.getElementById('seedGamesBtn').addEventListener('click', async () => {
    const ok = await confirmDialog(`This will add ${SEED_GAMES.length} games to Firestore. Existing games won't be duplicated. Continue?`);
    if (!ok) return;

    const btn = document.getElementById('seedGamesBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const existingSnap = await getDocs(collection(db, 'games'));
      const existingTitles = new Set(existingSnap.docs.map(d => d.data().title));

      let added = 0;
      const batch = writeBatch(db);
      SEED_GAMES.forEach(game => {
        if (!existingTitles.has(game.title)) {
          const ref = doc(collection(db, 'games'));
          batch.set(ref, { ...game, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          added++;
        }
      });

      if (added > 0) {
        await batch.commit();
        showToast(`${added} games seeded successfully`);
      } else {
        showToast('All games already exist — nothing to seed', 'info');
      }
    } catch (err) {
      console.error('Seed error:', err);
      showToast('Seed failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-download"></i> <span class="hide-mobile">Seed Games</span>';
    }
  });

  document.getElementById('syncGamesBtn').addEventListener('click', async () => {
    const ok = await confirmDialog(`Sync will overwrite ALL games in Firestore with the ${SEED_GAMES.length} built-in games. Any manually added games not in the seed list will remain. Continue?`);
    if (!ok) return;

    const btn = document.getElementById('syncGamesBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      // Get existing games
      const existingSnap = await getDocs(collection(db, 'games'));
      const existingMap = {};
      existingSnap.docs.forEach(d => { existingMap[d.data().title] = d.id; });

      const batch = writeBatch(db);
      let updated = 0, added = 0;

      SEED_GAMES.forEach(game => {
        if (existingMap[game.title]) {
          // Update existing
          batch.update(doc(db, 'games', existingMap[game.title]), {
            ...game,
            updatedAt: serverTimestamp()
          });
          updated++;
        } else {
          // Add new
          const ref = doc(collection(db, 'games'));
          batch.set(ref, { ...game, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          added++;
        }
      });

      await batch.commit();
      showToast(`Sync complete — ${updated} updated, ${added} added`);
      document.getElementById('statSync').textContent = '✓';
    } catch (err) {
      console.error('Sync error:', err);
      showToast('Sync failed: ' + err.message, 'error');
      document.getElementById('statSync').textContent = '✗';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> <span class="hide-mobile">Sync DB</span>';
    }
  });
}

// ══════════════════════════════════════════════════════════
// NEWS
// ══════════════════════════════════════════════════════════

function listenNews() {
  const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
  onSnapshot(q, snap => {
    allNews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNews();
    document.getElementById('statNews').textContent = allNews.length;
  }, err => {
    console.warn('News listen error:', err.message);
    document.getElementById('newsList').innerHTML = '<div class="table-empty">Could not load news.</div>';
  });
}

function renderNews() {
  const el = document.getElementById('newsList');

  if (!allNews.length) {
    el.innerHTML = '<div class="table-empty">No news or events yet. Click "Add News" to create one.</div>';
    return;
  }

  el.innerHTML = allNews.map(n => `
    <div class="admin-news-card" data-id="${n.id}">
      <div class="anc-top">
        <span class="anc-tag ${n.tagColor || 'tag-blue'}">${n.tag || 'NEWS'}</span>
        <span class="anc-date">${n.date || ''}</span>
      </div>
      <div class="anc-title">${n.title || ''}</div>
      <div class="anc-desc">${n.desc || ''}</div>
      <div class="anc-bottom">
        <span class="anc-cta">${n.ctaText ? `${n.ctaText} →` : ''}</span>
        <div class="anc-actions">
          <button class="action-btn action-edit" data-id="${n.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn action-delete" data-id="${n.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');

  // Bind actions
  el.querySelectorAll('.action-edit').forEach(btn => {
    btn.addEventListener('click', () => openNewsModal(allNews.find(n => n.id === btn.dataset.id)));
  });
  el.querySelectorAll('.action-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const news = allNews.find(n => n.id === btn.dataset.id);
      const ok = await confirmDialog(`Delete "${news?.title}"? This cannot be undone.`);
      if (ok) {
        await deleteDoc(doc(db, 'news', btn.dataset.id));
        showToast('News item deleted', 'info');
      }
    });
  });
}

// ── NEWS MODAL ────────────────────────────────────────────
const newsModal     = document.getElementById('newsModal');
const newsEditId    = document.getElementById('newsEditId');

function openNewsModal(news = null) {
  document.getElementById('newsModalTitle').textContent = news ? 'Edit News / Event' : 'Add News / Event';
  newsEditId.value = news?.id || '';
  document.getElementById('nfDate').value = news?.date || '';
  document.getElementById('nfTag').value = news?.tag || '';
  document.getElementById('nfTitle').value = news?.title || '';
  document.getElementById('nfDesc').value = news?.desc || '';
  document.getElementById('nfCtaText').value = news?.ctaText || '';
  document.getElementById('nfCtaLink').value = news?.ctaLink || '';

  // Tag color
  const colorVal = news?.tagColor || 'tag-blue';
  document.querySelectorAll('#nfTagColor input[type="radio"]').forEach(r => {
    r.checked = r.value === colorVal;
  });

  newsModal.classList.add('open');
}

function closeNewsModal() {
  newsModal.classList.remove('open');
}

function setupNewsForm() {
  document.getElementById('addNewsBtn').addEventListener('click', () => openNewsModal());
  document.getElementById('newsModalClose').addEventListener('click', closeNewsModal);
  document.getElementById('newsModalCancel').addEventListener('click', closeNewsModal);

  newsModal.addEventListener('click', e => { if (e.target === newsModal) closeNewsModal(); });

  document.getElementById('newsModalSave').addEventListener('click', async () => {
    const date = document.getElementById('nfDate').value.trim();
    const tag = document.getElementById('nfTag').value.trim();
    const title = document.getElementById('nfTitle').value.trim();
    const desc = document.getElementById('nfDesc').value.trim();
    const ctaText = document.getElementById('nfCtaText').value.trim();
    const ctaLink = document.getElementById('nfCtaLink').value.trim();
    const tagColor = document.querySelector('#nfTagColor input[type="radio"]:checked')?.value || 'tag-blue';

    if (!date) { showToast('Date is required', 'error'); return; }
    if (!tag) { showToast('Tag label is required', 'error'); return; }
    if (!title) { showToast('Title is required', 'error'); return; }
    if (!desc) { showToast('Description is required', 'error'); return; }

    const data = { date, tag, tagColor, title, desc, ctaText, ctaLink, updatedAt: serverTimestamp() };
    const editId = newsEditId.value;

    try {
      if (editId) {
        await updateDoc(doc(db, 'news', editId), data);
        showToast(`News item updated`);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'news'), data);
        showToast(`News item added`);
      }
      closeNewsModal();
    } catch (err) {
      console.error('News save error:', err);
      showToast('Failed to save news item', 'error');
    }
  });
}

// ══════════════════════════════════════════════════════════
// FEATURED TABS
// ══════════════════════════════════════════════════════════
const FEATURE_CATS = [
  { id: 'all', name: 'All' },
  { id: 'pc', name: 'PC' },
  { id: 'ps5', name: 'PS5' },
  { id: 'xbox', name: 'Xbox' },
  { id: 'sim', name: 'Sim' }
];

function renderFeaturedTabs() {
  const container = document.getElementById('featuredSections');
  if (!container) return;

  container.innerHTML = FEATURE_CATS.map(cat => {
    const featuredGames = allGames.filter(g => g.featuredInCategory && g.featuredInCategory[cat.id]);
    
    let listHtml = '';
    if (featuredGames.length === 0) {
      listHtml = `<div class="featured-empty">No games featured here yet.</div>`;
    } else {
      listHtml = featuredGames.map(g => `
        <div class="featured-item">
          <div class="featured-item-title">${g.title}</div>
          <button class="action-btn" style="color:var(--pink); background:rgba(255,45,120,0.1); border:none;" data-id="${g.id}" data-cat="${cat.id}" title="Remove feature"><i class="fa-solid fa-xmark"></i></button>
        </div>
      `).join('');
    }

    return `
      <div class="featured-section">
        <div class="featured-cat-header">
          <div class="featured-cat-title">${cat.id === 'all' ? '<i class="fa-solid fa-globe"></i>' : ''} ${cat.name}</div>
          <div class="featured-cat-count">${featuredGames.length} / 5</div>
        </div>
        <div class="featured-list">${listHtml}</div>
        <div style="margin-top:16px; text-align:right;">
          <button class="btn btn-outline-blue btn-sm feature-add-btn" data-cat="${cat.id}" data-count="${featuredGames.length}">
            <i class="fa-solid fa-plus"></i> Add Game
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Remove feature
  container.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gId = btn.dataset.id;
      const cat = btn.dataset.cat;
      const game = allGames.find(g => g.id === gId);
      if (!game) return;

      const newFeatured = { ...(game.featuredInCategory || {}) };
      newFeatured[cat] = false;
      
      try {
        await updateDoc(doc(db, 'games', gId), { featuredInCategory: newFeatured, updatedAt: serverTimestamp() });
        showToast('Game removed from ' + cat.toUpperCase() + ' features', 'info');
      } catch (err) {
        showToast('Error removing feature', 'error');
      }
    });
  });

  // Open modal config
  container.querySelectorAll('.feature-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (parseInt(btn.dataset.count) >= 5) {
        showToast('Maximum 5 games allowed per category.', 'error');
        return;
      }
      openFeatureModal(btn.dataset.cat);
    });
  });
}

function openFeatureModal(catId) {
  document.getElementById('ffCategory').value = catId;
  const currentCount = allGames.filter(g => g.featuredInCategory && g.featuredInCategory[catId]).length;
  document.getElementById('ffCount').textContent = currentCount;
  document.getElementById('featureModalTitle').textContent = `Feature in ${catId.toUpperCase()}`;

  const select = document.getElementById('ffGameSelect');
  
  // Games not already featured in this category AND available on this platform (or 'all')
  const available = allGames.filter(g => {
    const notFeatured = !(g.featuredInCategory && g.featuredInCategory[catId]);
    const matchesPlatform = catId === 'all' || (g.platform && g.platform.includes(catId));
    return notFeatured && matchesPlatform;
  });

  if (available.length === 0) {
    select.innerHTML = `<option value="">-- No eligible games available --</option>`;
    select.disabled = true;
    document.getElementById('featureModalSave').disabled = true;
  } else {
    select.disabled = false;
    document.getElementById('featureModalSave').disabled = false;
    select.innerHTML = available.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
  }

  document.getElementById('featureModal').classList.add('open');
}

function closeFeatureModal() {
  document.getElementById('featureModal').classList.remove('open');
}

function setupFeatureForm() {
  document.getElementById('featureModalClose').addEventListener('click', closeFeatureModal);
  document.getElementById('featureModalCancel').addEventListener('click', closeFeatureModal);

  document.getElementById('featureModal').addEventListener('click', e => {
    if (e.target === document.getElementById('featureModal')) closeFeatureModal();
  });

  document.getElementById('featureModalSave').addEventListener('click', async () => {
    const catId = document.getElementById('ffCategory').value;
    const gameId = document.getElementById('ffGameSelect').value;
    if (!gameId) return;

    const game = allGames.find(g => g.id === gameId);
    if (!game) return;

    const newFeatured = { ...(game.featuredInCategory || {}) };
    newFeatured[catId] = true;

    try {
      await updateDoc(doc(db, 'games', gameId), { featuredInCategory: newFeatured, updatedAt: serverTimestamp() });
      showToast(`Added to ${catId.toUpperCase()} featured list`, 'success');
      closeFeatureModal();
    } catch (err) {
      showToast('Error saving featured list', 'error');
    }
  });
}