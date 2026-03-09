/* ============================================================
   LOGINN GAMING CAFE — js/index.js
   Homepage-specific scripts
============================================================ */

'use strict';

// ===== ACTIVE NAV LINK on scroll (homepage hash sections) =====
// FIX 1: Use class toggling, not inline style.color, to avoid conflicts
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
    // Only manage hash links here (not page links — those are handled by common.js)
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    link.classList.toggle('active', href === `#${activeId}`);
  });
};

window.addEventListener('scroll', highlightNav, { passive: true });
highlightNav(); // run on load

// ===== PRICE CALCULATOR =====
(function () {
  const resultEl    = document.getElementById('calcResult');
  const breakdownEl = document.getElementById('calcBreakdown');
  const hoursEl     = document.getElementById('hoursDisplay');
  const stepUp      = document.getElementById('stepUp');
  const stepDown    = document.getElementById('stepDown');
  const ctrlRow     = document.getElementById('controllerRow');
  if (!resultEl) return;

  let hours = 1, platform = 'pc', controllers = 1;

  function calcPrice() {
    const base  = 150 + Math.max(0, hours - 1) * 100;
    const extra = (platform === 'console' && controllers === 2) ? 50 : 0;
    const total = base + extra;
    const parts = [`₹150 for 1st hr`];
    if (hours > 1) parts.push(`₹100 × ${hours - 1} hr${hours > 2 ? 's' : ''}`);
    if (extra)     parts.push(`₹50 (2nd controller)`);
    resultEl.textContent    = `₹${total}`;
    breakdownEl.textContent = parts.join(' + ');
    hoursEl.textContent     = hours;
  }

  stepUp.addEventListener('click',   () => { if (hours < 12) { hours++; calcPrice(); } });
  stepDown.addEventListener('click', () => { if (hours > 1)  { hours--; calcPrice(); } });

  document.querySelectorAll('.calc-opt[data-platform]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-opt[data-platform]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      platform = btn.dataset.platform;
      ctrlRow.style.display = platform === 'console' ? 'flex' : 'none';
      calcPrice();
    });
  });

  document.querySelectorAll('.calc-opt[data-ctrl]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-opt[data-ctrl]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      controllers = parseInt(btn.dataset.ctrl);
      calcPrice();
    });
  });

  calcPrice();
})();