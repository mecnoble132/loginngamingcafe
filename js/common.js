/* ============================================================
   LOGINN GAMING CAFE — js/common.js
   Navbar, Hamburger, Smooth Scroll, Scroll Reveal
============================================================ */

'use strict';

// ===== PAGE LOADER =====
(function () {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  // Hide after 500 ms (bar animation completes), then remove after fade
  setTimeout(() => {
    loader.classList.add('loader-hidden');
    setTimeout(() => loader.remove(), 150);
  }, 500);
})();

// ===== NAVBAR: Scrolled state =====
const navbar = document.getElementById('navbar');
const onScroll = () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);
};
window.addEventListener('scroll', onScroll, { passive: true });

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target) && navLinks.classList.contains('open')) {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
});

// ===== ACTIVE NAV LINK — highlight current PAGE only (not hash anchors) =====
// FIX 1: Only mark a link active if it points to a real page file (not a #hash).
// Hash-based section highlighting is handled by index.js on the homepage.
const currentPath = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-link').forEach(link => {
  const href = link.getAttribute('href');
  if (!href) return;
  // Skip pure anchor links — don't mark them active via this check
  if (href.startsWith('#')) return;
  const linkFile = href.split('/').pop().split('#')[0] || 'index.html';
  if (linkFile === currentPath) link.classList.add('active');
});

// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  revealObserver.observe(el);
});

// ===== SECTION HEADER REVEAL =====
const headerObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      headerObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.section-header').forEach(el => {
  el.classList.add('reveal');
  headerObserver.observe(el);
});

// ===== SMOOTH ANCHOR SCROLL (offset for fixed nav) =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (!target) return;
    e.preventDefault();
    const navHeight = navbar.offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 10;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ===== CURSOR GLOW on cards =====
document.querySelectorAll('.sp-card, .member-card, .review-card, .news-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width)  * 100}%`);
    card.style.setProperty('--my', `${((e.clientY - rect.top)  / rect.height) * 100}%`);
  });
});

// ===== GALLERY LIGHTBOX =====
document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    const img = item.querySelector('img');
    if (!img) return;
    openLightbox(img.src, img.alt);
  });
});

function openLightbox(src, alt) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.92);
    display:flex;align-items:center;justify-content:center;
    cursor:zoom-out;padding:20px;animation:fadeIn 0.2s ease;
  `;
  const imgEl = document.createElement('img');
  imgEl.src = src; imgEl.alt = alt;
  imgEl.style.cssText = `max-width:90vw;max-height:88vh;border-radius:10px;box-shadow:0 0 60px rgba(0,212,255,0.2);object-fit:contain;width:auto;height:auto;`;
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  closeBtn.style.cssText = `position:fixed;top:20px;right:24px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:1.2rem;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10000;transition:background 0.2s;`;
  overlay.appendChild(imgEl);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const close = () => {
    overlay.style.opacity = '0'; overlay.style.transition = 'opacity 0.2s';
    setTimeout(() => { document.body.removeChild(overlay); document.body.style.overflow = ''; }, 200);
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
}

const fadeStyle = document.createElement('style');
fadeStyle.textContent = '@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }';
document.head.appendChild(fadeStyle);

// ===== CONSOLE EASTER EGG =====
console.log('%c LOGINN GAMING CAFE ', 'background:#00d4ff;color:#000;font-family:monospace;font-size:18px;font-weight:bold;padding:8px 16px;border-radius:4px;');
console.log('%c Ready to level up? 🎮', 'color:#ff2d78;font-size:14px;');