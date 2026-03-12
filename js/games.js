/* ============================================================
   LOGINN GAMING CAFE — js/games.js
   Games Library — cards with search + filter
============================================================ */
'use strict';

const GAMES = [
  /* ── LAN PC ── */
  { title: 'Valorant', steamId: null, platform: ['pc', 'ps5', 'xbox'], genre: 'Tactical Shooter', tags: ['Competitive', 'Team', 'FPS'], color: '#ff4655' },
  { title: 'PUBG PC', steamId: 578080, platform: ['pc'], genre: 'Battle Royale', tags: ['Battle Royale', 'Solo', 'Squad'], color: '#f5a623' },
  { title: 'Counter-Strike 2', steamId: 730, platform: ['pc'], genre: 'Tactical Shooter', tags: ['Competitive', 'Team', 'FPS'], color: '#f0a500' },
  { title: 'Dota 2', steamId: 570, platform: ['pc'], genre: 'MOBA', tags: ['Strategy', 'Team', 'MOBA'], color: '#c23c2a' },
  { title: 'Rainbow Six Siege', steamId: 359550, platform: ['pc', 'ps5', 'xbox'], genre: 'Tactical Shooter', tags: ['Competitive', 'Team', 'FPS'], color: '#1a9cff' },
  { title: 'The Finals', steamId: 1966720, platform: ['pc', 'ps5', 'xbox'], genre: 'Battle Royale', tags: ['Competitive', 'Team', 'FPS'], color: '#ff6b35' },
  { title: 'Apex Legends', steamId: 1172470, platform: ['pc', 'ps5', 'xbox'], genre: 'Battle Royale', tags: ['Battle Royale', 'Team', 'FPS'], color: '#cd3333' },

  /* ── PS5 + Xbox + PC ── */
  { title: 'EA FC 26', steamId: 3405690, platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'EA FC 25', steamId: 2582880, platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'EA FC 24', steamId: 2140330, platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'FIFA 23', steamId: 1811260, platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'FIFA 22', steamId: 1506830, platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'FIFA 21', steamId: 1313860, platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Multiplayer'], color: '#00d46a' },
  { title: 'FIFA 19', steamId: null, platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Classics'], color: '#00d46a' },
  { title: 'eFootball', steamId: 1665460, platform: ['ps5', 'xbox', 'pc'], genre: 'Sports', tags: ['Football', 'Free-to-Play'], color: '#00d46a' },
  { title: 'WWE 2K25', steamId: 2878960, platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['Wrestling', 'Multiplayer'], color: '#e8c84a' },
  { title: 'WWE 2K24', steamId: 2315690, platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['Wrestling', 'Multiplayer'], color: '#e8c84a' },
  { title: 'UFC 5', steamId: null, platform: ['ps5', 'xbox'], genre: 'Fighting', tags: ['MMA', '1v1'], color: '#ff4500' },
  { title: 'F1 25', steamId: 3059520, platform: ['ps5', 'xbox', 'pc'], genre: 'Racing', tags: ['Formula 1', 'Sim', 'Solo'], color: '#e10600' },
  { title: 'F1 24', steamId: 2488620, platform: ['ps5', 'xbox', 'pc'], genre: 'Racing', tags: ['Formula 1', 'Sim', 'Solo'], color: '#e10600' },
  { title: 'Dirt 5', steamId: 1038250, platform: ['ps5', 'xbox', 'pc'], genre: 'Racing', tags: ['Offroad', 'Arcade'], color: '#e65c00' },
  { title: 'Mortal Kombat 1', steamId: 1971870, platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['1v1', 'Arcade', 'Brutal'], color: '#b91c1c' },
  { title: 'Mortal Kombat 11', steamId: 976310, platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['1v1', 'Arcade', 'Brutal'], color: '#b91c1c' },
  { title: 'Street Fighter V', steamId: 310950, platform: ['ps5', 'pc'], genre: 'Fighting', tags: ['1v1', 'Arcade'], color: '#ff6600' },
  { title: 'Injustice 2', steamId: 627270, platform: ['ps5', 'xbox', 'pc'], genre: 'Fighting', tags: ['1v1', 'DC', 'Arcade'], color: '#4a90d9' },
  { title: 'It Takes Two', steamId: 1426210, platform: ['ps5', 'xbox', 'pc'], genre: 'Co-op', tags: ['Co-op', 'Story', '2 Players'], color: '#f72585' },
  { title: 'A Way Out', steamId: 1222700, platform: ['ps5', 'xbox', 'pc'], genre: 'Co-op', tags: ['Co-op', 'Story', '2 Players'], color: '#7b2d8b' },
  { title: 'Biped', steamId: 1071870, platform: ['ps5', 'xbox', 'pc'], genre: 'Co-op', tags: ['Co-op', 'Casual', '2 Players'], color: '#06b6d4' },
  { title: 'Chained Together', steamId: 2563560, platform: ['pc'], genre: 'Co-op', tags: ['Co-op', 'Platformer', 'Chaos'], color: '#a855f7' },
  { title: 'Stick Fight', steamId: 674940, platform: ['pc'], genre: 'Party', tags: ['Party', 'Casual', '4 Players'], color: '#84cc16' },
  { title: 'Road Redemption', steamId: 290300, platform: ['ps5', 'xbox', 'pc'], genre: 'Action', tags: ['Racing', 'Combat', 'Chaos'], color: '#dc2626' },
  { title: 'CarX Street', steamId: 1114150, platform: ['ps5', 'xbox', 'pc'], genre: 'Racing', tags: ['Street', 'Drift', 'Open World'], color: '#f97316' },
  { title: 'Call of Duty Series', steamId: 1964010, platform: ['ps5', 'xbox', 'pc'], genre: 'FPS', tags: ['FPS', 'Multiplayer', 'Action'], color: '#78716c' },
  { title: 'Horizon Zero Dawn', steamId: 1151640, platform: ['ps5', 'pc'], genre: 'RPG', tags: ['Open World', 'Story', 'Solo'], color: '#f59e0b' },
  { title: 'Ghost of Tsushima', steamId: 2215430, platform: ['ps5', 'pc'], genre: 'Action', tags: ['Open World', 'Story', 'Samurai'], color: '#e11d48' },
  { title: 'The Last of Us Part II', steamId: 2531310, platform: ['ps5', 'pc'], genre: 'Adventure', tags: ['Story', 'Survival', 'Emotional'], color: '#22c55e' },
  { title: 'The Last of Us Part I', steamId: 1888590, platform: ['ps5', 'pc'], genre: 'Adventure', tags: ['Story', 'Survival', 'Classic'], color: '#16a34a' },
  { title: 'Uncharted Series', steamId: 1659420, platform: ['ps5', 'pc'], genre: 'Adventure', tags: ['Action', 'Story', 'Multiplayer'], color: '#d97706' },
  { title: 'Spider-Man 2', steamId: 2651280, platform: ['ps5', 'pc'], genre: 'Action', tags: ['Open World', 'Story', 'Marvel'], color: '#ef4444' },
  { title: 'Spider-Man: Miles Morales', steamId: 1817190, platform: ['ps5', 'pc'], genre: 'Action', tags: ['Open World', 'Story', 'Marvel'], color: '#a855f7' },

  /* ── Racing SIM ── */
  { title: 'Gran Turismo 7', steamId: null, platform: ['ps5', 'sim'], genre: 'Racing Sim', tags: ['Sim', 'Cars', 'Realistic'], color: '#fbbf24' },
  { title: 'Assetto Corsa Competizione', steamId: 805550, platform: ['pc', 'ps5', 'xbox', 'sim'], genre: 'Racing Sim', tags: ['Sim', 'GT', 'Hardcore'], color: '#22d3ee' },
  { title: 'WRC Generations', steamId: 1953520, platform: ['pc', 'ps5', 'xbox', 'sim'], genre: 'Racing Sim', tags: ['Rally', 'Sim', 'Offroad'], color: '#a3e635' },
  { title: 'Euro Truck Simulator', steamId: 227300, platform: ['pc', 'sim'], genre: 'Simulation', tags: ['Relaxing', 'Sim', 'Open World'], color: '#60a5fa' },
  { title: 'Forza Horizon 5', steamId: 1551360, platform: ['pc', 'xbox', 'sim'], genre: 'Racing', tags: ['Arcade', 'Open World', 'Cars'], color: '#fb923c' },
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
  return `
    <div class="game-card reveal" data-platform="${g.platform.join(' ')}" data-title="${g.title.toLowerCase()}" data-genre="${g.genre.toLowerCase()}">
      <div class="game-card-glow" style="--glow:${g.color}"></div>

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

/* ── Render ── */
const list = document.getElementById('gamesList');
const countEl = document.getElementById('visibleCount');
const searchEl = document.getElementById('gameSearch');

function render(filter, query) {
  const q = (query || '').toLowerCase().trim();
  let visible = 0;
  list.innerHTML = GAMES.map(g => {
    const matchFilter = filter === 'all' || g.platform.includes(filter);
    const matchSearch = !q || g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q) || g.tags.some(t => t.toLowerCase().includes(q));
    if (matchFilter && matchSearch) { visible++; return buildCard(g); }
    return '';
  }).join('');
  if (countEl) countEl.textContent = visible;
  if (visible === 0) {
    list.innerHTML = `<div class="games-empty"><i class="fa-solid fa-magnifying-glass"></i><p>No games found for "<strong>${query}</strong>"</p></div>`;
  }
  document.querySelectorAll('.game-card.reveal').forEach((el, i) => {
    setTimeout(() => el.classList.add('revealed'), i * 30);
  });
}

let currentFilter = 'all';
let currentQuery = '';

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render(currentFilter, currentQuery);
  });
});

if (searchEl) {
  searchEl.addEventListener('input', () => {
    currentQuery = searchEl.value;
    render(currentFilter, currentQuery);
  });
}

render('all', '');