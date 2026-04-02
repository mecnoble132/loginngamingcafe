/* ============================================================
   LOGINN GAMING CAFE — js/games.js
   Games Library — loads from Firestore, falls back to hardcoded
============================================================ */
'use strict';

import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── HARDCODED FALLBACK ────────────────────────────────────
const FALLBACK_GAMES = [
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

/* ── Helpers ── */
function platformBadges(platforms) {
  return platforms.map(p => {
    const map = { pc: ['PC', 'pc'], ps5: ['PS5', 'ps5'], xbox: ['XBOX', 'xbox'], sim: ['SIM', 'sim'] };
    const [label, cls] = map[p] || [p, p];
    return `<span class="pill-platform ${cls}">${label}</span>`;
  }).join('');
}

function genreIcon(genre) {
  const icons = {
    'Tactical Shooter': 'fa-crosshairs',
    'Battle Royale': 'fa-parachute-box',
    'MOBA': 'fa-chess-knight',
    'Sports': 'fa-futbol',
    'Fighting': 'fa-hand-fist',
    'Racing': 'fa-flag-checkered',
    'Racing Sim': 'fa-flag-checkered',
    'Simulation': 'fa-truck',
    'Co-op': 'fa-people-group',
    'Party': 'fa-champagne-glasses',
    'Action': 'fa-bolt',
    'Action RPG': 'fa-dragon',
    'Adventure': 'fa-map',
    'RPG': 'fa-hat-wizard',
    'FPS': 'fa-gun',
  };
  return icons[genre] || 'fa-gamepad';
}

function buildCard(g) {
  const coverUrl = g.coverId
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${g.coverId}.jpg`
    : null;

  const imgHtml = coverUrl
    ? `<div class="game-card-img">
         <img src="${coverUrl}" alt="${g.title} cover" loading="lazy"
              onerror="this.parentElement.style.display='none'">
       </div>`
    : '';

  return `
    <div class="game-card reveal" data-platform="${g.platform.join(' ')}" data-title="${g.title.toLowerCase()}" data-genre="${g.genre.toLowerCase()}">
      <div class="game-card-glow" style="--glow:${g.color}"></div>

      ${imgHtml}

      <div class="game-card-body">
        <div class="game-card-top">
          <div class="game-card-platform">${platformBadges(g.platform)}</div>
        </div>
        <h3 class="game-card-title">${g.title}</h3>
        <div class="game-card-genre"><i class="fa-solid ${genreIcon(g.genre)}"></i> ${g.genre}</div>
        <div class="game-card-tags">${g.tags.map(t => `<span class="game-tag">${t}</span>`).join('')}</div>
      </div>
      <div class="game-card-avail"><span class="avail-dot"></span> Available Now</div>
    </div>`;
}

function buildTeaserCard(g) {
  const coverUrl = g.coverId
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${g.coverId}.jpg`
    : null;
  const imgHtml = coverUrl
    ? `<div class="teaser-card-img">
         <img src="${coverUrl}" alt="${g.title} cover" loading="lazy"
              onerror="this.parentElement.style.display='none'">
       </div>`
    : '';
  const icon = genreIcon(g.genre);
  return `
    <div class="teaser-card reveal" style="--glow:${g.color}">
      <div class="teaser-card-glow"></div>
      ${imgHtml}
      <div class="teaser-card-body">
        <div class="teaser-card-platforms">${platformBadges(g.platform)}</div>
        <div class="teaser-card-title">${g.title}</div>
        <div class="teaser-card-genre"><i class="fa-solid ${icon}"></i> ${g.genre}</div>
      </div>
      <div class="teaser-card-avail"><span class="teaser-avail-dot"></span> Available Now</div>
    </div>`;
}

/* ── Render ── */
const list = document.getElementById('gamesList');
const countEl = document.getElementById('visibleCount');
const searchEl = document.getElementById('gameSearch');

// Also for the index.html teaser
const teaserGrid = document.getElementById('teaserGrid');

let GAMES = [];
let currentFilter = 'all';
let currentQuery = '';

function render(filter, query) {
  if (!list && !teaserGrid) return;

  const q = (query || '').toLowerCase().trim();
  let visible = 0;

  // Full games page
  if (list) {
    list.innerHTML = GAMES.map(g => {
      const matchFilter = filter === 'all' || g.platform.includes(filter);
      const matchSearch = !q || g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q) || g.tags.some(t => t.toLowerCase().includes(q));
      if (matchFilter && matchSearch) { visible++; return buildCard(g); }
      return '';
    }).join('');
    if (countEl) countEl.textContent = visible;
    if (visible === 0 && q) {
      list.innerHTML = `<div class="games-empty"><i class="fa-solid fa-magnifying-glass"></i><p>No games found for "<strong>${query}</strong>"</p></div>`;
    }
    document.querySelectorAll('.game-card.reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 30);
    });
  }

  // Index page teaser (show max 5 featured games)
  if (teaserGrid) {
    const featured = GAMES.filter(g => g.featuredInCategory && g.featuredInCategory[filter]);
    const sliced = featured.slice(0, 5);
    teaserGrid.innerHTML = sliced.map(g => buildTeaserCard(g)).join('');
    
    const countEl = document.getElementById('teaserCount');
    if (countEl) countEl.textContent = sliced.length;
    
    document.querySelectorAll('#teaserGrid .teaser-card.reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 50);
    });
  }
}

// ── Filter buttons (games page + teaser) ─────────
document.querySelectorAll('.filter-btn, .teaser-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const isTeaser = btn.classList.contains('teaser-filter-btn');
    const group = isTeaser ? '.teaser-filter-btn' : '.filter-btn';
    
    document.querySelectorAll(group).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const filterValue = btn.dataset.filter;
    
    if (isTeaser) {
      const catEl = document.getElementById('teaserCatName');
      if (catEl) catEl.textContent = btn.textContent.trim();
      render(filterValue, '');
    } else {
      currentFilter = filterValue;
      render(currentFilter, currentQuery);
    }
  });
});

if (searchEl) {
  searchEl.addEventListener('input', () => {
    currentQuery = searchEl.value;
    render(currentFilter, currentQuery);
  });
}

// ── Load games ─────────────────────────────────────────
async function loadGames() {
  try {
    const snap = await getDocs(query(collection(db, 'games'), orderBy('title', 'asc')));
    if (!snap.empty) {
      GAMES = snap.docs.map(d => d.data());
    } else {
      GAMES = FALLBACK_GAMES;
    }
  } catch (e) {
    console.warn('Games load fallback:', e.message);
    GAMES = FALLBACK_GAMES;
  }
  render('all', '');
}

loadGames();