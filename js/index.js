/* ============================================================
   LOGINN GAMING CAFE — js/index.js
   Homepage-specific scripts
============================================================ */

'use strict';

// ===== ACTIVE NAV LINK on scroll (homepage hash sections) =====
const sections   = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-link');

const highlightNav = () => {
  const scrollY = window.scrollY + 120;
  let activeId = null;

  sections.forEach(section => {
    if (scrollY >= section.offsetTop && scrollY < section.offsetTop + section.offsetHeight) {
      activeId = section.getAttribute('id');
    }
  });

  navLinkEls.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    link.classList.toggle('active', href === `#${activeId}`);
  });
};

window.addEventListener('scroll', highlightNav, { passive: true });
highlightNav();

// ===== PRICE CALCULATOR =====
// Pricing rules:
//   PC:          1st hr ₹150 · each extra hr ₹100 · DAY CAP ₹600
//   Console/SIM: 1st hr ₹150 + ₹50×(players-1) · each extra hr ₹100 + ₹50×(players-1)
(function () {
  const PC_DAY_CAP = 600;
  const FIRST_HR   = 150;
  const EXTRA_HR   = 100;
  const CTRL_FEE   = 50;   // per extra player, per hour

  const resultEl    = document.getElementById('calcResult');
  const breakdownEl = document.getElementById('calcBreakdown');
  const hoursEl     = document.getElementById('hoursDisplay');
  const stepUp      = document.getElementById('stepUp');
  const stepDown    = document.getElementById('stepDown');
  const ctrlRow     = document.getElementById('controllerRow');
  if (!resultEl) return;

  let hours = 1, platform = 'pc', controllers = 1;

  function calcPrice() {
    let total, breakdown, capped = false;

    if (platform === 'pc') {
      total  = FIRST_HR + Math.max(0, hours - 1) * EXTRA_HR;
      capped = total > PC_DAY_CAP;
      total  = Math.min(total, PC_DAY_CAP);

      if (capped) {
        breakdown = `₹${FIRST_HR} 1st hr + ₹${EXTRA_HR}/hr after · Day rate applied (capped at ₹${PC_DAY_CAP})`;
      } else if (hours === 1) {
        breakdown = `₹${FIRST_HR} for 1st hr`;
      } else {
        breakdown = `₹${FIRST_HR} 1st hr + ₹${EXTRA_HR} × ${hours - 1} hr${hours - 1 > 1 ? 's' : ''} after`;
      }
    } else {
      // Console / SIM: extra ₹50 per additional player, every hour
      const extraCtrl = controllers - 1;
      const firstHr   = FIRST_HR + extraCtrl * CTRL_FEE;
      const laterHr   = EXTRA_HR  + extraCtrl * CTRL_FEE;
      total = firstHr + Math.max(0, hours - 1) * laterHr;

      if (hours === 1) {
        breakdown = `₹${firstHr} for 1st hr · ${controllers} player${controllers > 1 ? 's' : ''}`;
      } else {
        breakdown = `₹${firstHr} 1st hr + ₹${laterHr} × ${hours - 1} hr${hours - 1 > 1 ? 's' : ''} · ${controllers} players`;
      }
    }

    resultEl.textContent    = `₹${total}`;
    resultEl.style.color    = capped ? 'var(--green)' : '';
    breakdownEl.textContent = breakdown;
    hoursEl.textContent     = hours;
  }

  // Hour stepper (max 24 hrs)
  stepUp.addEventListener('click',   () => { if (hours < 24) { hours++; calcPrice(); } });
  stepDown.addEventListener('click', () => { if (hours > 1)  { hours--; calcPrice(); } });

  // Platform buttons
  document.querySelectorAll('.calc-opt[data-platform]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-opt[data-platform]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      platform = btn.dataset.platform;
      // Show player selector for console only (SIM is single-player)
      ctrlRow.style.display = (platform === 'console') ? '' : 'none';
      controllers = 1;
      document.querySelectorAll('.ctrl-opt').forEach((b, i) => b.classList.toggle('active', i === 0));
      calcPrice();
    });
  });

  // Player/controller buttons (1–4)
  document.querySelectorAll('.ctrl-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ctrl-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      controllers = parseInt(btn.dataset.ctrl, 10);
      calcPrice();
    });
  });

  calcPrice();
})();
// ===== GAMES TEASER =====
// Add this block to the bottom of your js/index.js
// It reuses the GAMES array and helpers from games.js
// Make sure games.js is loaded BEFORE index.js in index.html:
//   <script src="js/games.js"></script>
//   <script src="js/index.js"></script>

(function () {
  const grid     = document.getElementById('teaserGrid');
  const countEl  = document.getElementById('teaserCount');
  if (!grid || typeof GAMES === 'undefined') return;

  // How many cards to show per filter (keeps the teaser compact)
  const LIMIT = 5;

  const genreIconMap = {
    'Tactical Shooter': 'fa-crosshairs', 'Battle Royale': 'fa-parachute-box',
    'MOBA': 'fa-chess-knight', 'Sports': 'fa-futbol', 'Fighting': 'fa-hand-fist',
    'Racing': 'fa-flag-checkered', 'Racing Sim': 'fa-flag-checkered',
    'Simulation': 'fa-truck', 'Co-op': 'fa-people-group', 'Party': 'fa-champagne-glasses',
    'Action': 'fa-bolt', 'Adventure': 'fa-map', 'RPG': 'fa-hat-wizard', 'FPS': 'fa-gun',
  };

  function platformBadgesTeaser(platforms) {
    return platforms.map(p => {
      const map = { pc: ['PC','pc'], ps5: ['PS5','ps5'], xbox: ['XBOX','xbox'], sim: ['SIM','sim'] };
      const [label, cls] = map[p] || [p, p];
      return `<span class="pill-platform ${cls}">${label}</span>`;
    }).join('');
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
    const icon = genreIconMap[g.genre] || 'fa-gamepad';
    return `
      <div class="teaser-card reveal" style="--glow:${g.color}">
        <div class="teaser-card-glow"></div>
        ${imgHtml}
        <div class="teaser-card-body">
          <div class="teaser-card-platforms">${platformBadgesTeaser(g.platform)}</div>
          <div class="teaser-card-title">${g.title}</div>
          <div class="teaser-card-genre"><i class="fa-solid ${icon}"></i> ${g.genre}</div>
        </div>
        <div class="teaser-card-avail"><span class="teaser-avail-dot"></span> Available Now</div>
      </div>`;
  }

  function renderTeaser(filter) {
    const filtered = filter === 'all'
      ? GAMES
      : GAMES.filter(g => g.platform.includes(filter));
    const shown = filtered.slice(0, LIMIT);
    grid.innerHTML = shown.map(buildTeaserCard).join('');
    if (countEl) countEl.textContent = shown.length;
    document.querySelectorAll('.teaser-card.reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('revealed'), i * 40);
    });
  }

  // Filter buttons
  document.querySelectorAll('.teaser-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.teaser-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTeaser(btn.dataset.filter);
    });
  });

  renderTeaser('all');
})();