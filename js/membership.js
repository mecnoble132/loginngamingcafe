/* ============================================================
   LOGINN GAMING CAFE — js/membership.js
   FAQ accordion
============================================================ */

'use strict';

document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    // Open clicked (unless it was already open)
    if (!isOpen) item.classList.add('open');
  });
});