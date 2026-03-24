/* ============================================================
   LOGINN GAMING CAFE — js/admin.js
   Admin dashboard: login, bookings table, walk-in management
============================================================ */
'use strict';

import { db, auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection, onSnapshot, query, where, orderBy,
  doc, updateDoc, addDoc, serverTimestamp, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── STATION CONFIG (mirrors booking.js) ───────────────────
const STATION_NAMES = {
  'standard-pc': 'Standard PC',
  'performance-pc': 'Performance PC',
  'story-pc': 'Story PC',
  'ps5': 'PS5',
  'xbox': 'Xbox',
  'ps5-sim': 'PS5 SIM',
  'pc-sim': 'PC SIM',
};

const STATION_CAPACITY = {
  'standard-pc': 10, 'performance-pc': 5, 'story-pc': 1,
  'ps5': 3, 'xbox': 1, 'ps5-sim': 1, 'pc-sim': 1,
};

// ── AUTH ───────────────────────────────────────────────────
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

// ── DASHBOARD ─────────────────────────────────────────────
let allBookings = [];
let activeWalkins = [];

function initDashboard() {
  listenBookings();
  listenWalkins();
  setupFilters();
  setupWalkinForm();
}

// ── TODAY HELPER ───────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${+day} ${months[+m - 1]} ${y}`;
}

// ── BOOKINGS LISTENER ──────────────────────────────────────
function listenBookings() {
  const q = query(collection(db, 'bookings'), orderBy('date', 'desc'));
  onSnapshot(q, snap => {
    allBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderBookings();
    updateStats();
  });
}

// ── FILTERS ───────────────────────────────────────────────
let filterDate = '';
let filterStation = '';

function setupFilters() {
  const dateEl = document.getElementById('filterDate');
  const stationEl = document.getElementById('filterStation');

  // default to today
  dateEl.value = todayStr();
  filterDate = todayStr();

  dateEl.addEventListener('change', () => { filterDate = dateEl.value; renderBookings(); });
  stationEl.addEventListener('change', () => { filterStation = stationEl.value; renderBookings(); });
  document.getElementById('clearFilters').addEventListener('click', () => {
    dateEl.value = ''; filterDate = '';
    stationEl.value = ''; filterStation = '';
    renderBookings();
  });
}

function renderBookings() {
  const tbody = document.getElementById('bookingsTbody');
  let list = allBookings;

  if (filterDate) list = list.filter(b => b.date === filterDate);
  if (filterStation) list = list.filter(b => b.station === filterStation);

  // Sort: booked first (by date+time), completed at bottom
  list = [...list].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    return (a.date + a.time) > (b.date + b.time) ? 1 : -1;
  });

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="table-empty">No bookings found.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(b => {
    const isCompleted = b.status === 'completed';
    const statusBadge = isCompleted
      ? '<span class="status-badge status-completed">Completed</span>'
      : '<span class="status-badge status-booked">Booked</span>';
    const actionBtn = isCompleted
      ? `<button class="action-btn action-undo" data-id="${b.id}" data-action="undo">↩ Undo</button>`
      : `<button class="action-btn action-complete" data-id="${b.id}" data-action="complete">✓ Complete</button>`;

    return `<tr class="${isCompleted ? 'row-completed' : ''}">
      <td><code>${b.ref || '—'}</code></td>
      <td>${b.name || '—'}</td>
      <td><a href="tel:${b.phone}" style="color:var(--blue)">${b.phone || '—'}</a></td>
      <td>${STATION_NAMES[b.station] || b.station}</td>
      <td>${b.unitsLabel || '—'}</td>
      <td>${formatDate(b.date)}</td>
      <td>${b.time || '—'}</td>
      <td>${b.duration ? b.duration + 'h' : '—'}</td>
      <td>₹${b.totalPrice || '—'}</td>
      <td>${statusBadge}</td>
      <td>${actionBtn}</td>
    </tr>`;
  }).join('');

  // Bind action buttons
  tbody.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'complete') {
        // Find the booking object so we can verify identity
        const booking = allBookings.find(b => b.id === id);
        if (!booking) return;
        openVerifyModal(booking, async () => {
          await updateDoc(doc(db, 'bookings', id), { status: 'completed' });
        });
      } else {
        // Undo — no verification needed
        await updateDoc(doc(db, 'bookings', id), { status: 'booked' });
      }
    });
  });
}

// ── WALK-INS LISTENER ──────────────────────────────────────
function listenWalkins() {
  const q = query(collection(db, 'walkins'), orderBy('loggedAt', 'desc'));
  onSnapshot(q, snap => {
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    activeWalkins = all.filter(w => w.status === 'active');
    const completed = all.filter(w => w.status === 'completed');
    renderActiveWalkins(activeWalkins);
    renderCompletedWalkins(completed);
    updateStats();
  });
}

function renderActiveWalkins(list) {
  const el = document.getElementById('activeWalkins');
  if (!list.length) {
    el.innerHTML = '<div class="table-empty">No active walk-ins.</div>';
    return;
  }
  el.innerHTML = list.map(w => {
    const startLabel = w.startTime || '—';
    const unitsLabel = w.units > 1 ? `${w.units} units` : '1 unit';
    return `
      <div class="wi-card" data-id="${w.id}">
        <div class="wi-info">
          <div class="wi-station">${STATION_NAMES[w.station] || w.station}</div>
          <div class="wi-meta">${unitsLabel} · Started ${startLabel}</div>
        </div>
        <button class="action-btn action-complete" data-id="${w.id}" data-type="walkin" data-action="complete">
          ✓ Check Out
        </button>
      </div>`;
  }).join('');

  el.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateDoc(doc(db, 'walkins', btn.dataset.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
      });
    });
  });
}

function renderCompletedWalkins(list) {
  const el = document.getElementById('completedWalkins');
  if (!list.length) {
    el.innerHTML = '<div class="table-empty">None yet.</div>';
    return;
  }
  el.innerHTML = list.map(w => {
    const unitsLabel = w.units > 1 ? `${w.units} units` : '1 unit';
    return `
      <div class="wi-card completed" data-id="${w.id}">
        <div class="wi-info">
          <div class="wi-station">${STATION_NAMES[w.station] || w.station}</div>
          <div class="wi-meta">${unitsLabel} · Started ${w.startTime || '—'}</div>
        </div>
        <button class="action-btn action-undo" data-id="${w.id}" data-action="undo-walkin">
          ↩ Undo
        </button>
      </div>`;
  }).join('');

  el.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateDoc(doc(db, 'walkins', btn.dataset.id), { status: 'active', completedAt: null });
    });
  });
}

// ── LOG WALK-IN ────────────────────────────────────────────
function setupWalkinForm() {
  // Pre-fill time to now (nearest 10 min)
  const now = new Date();
  const h = now.getHours();
  const m = Math.floor(now.getMinutes() / 10) * 10;
  document.getElementById('wiTime').value =
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  document.getElementById('logWalkinBtn').addEventListener('click', async () => {
    const station = document.getElementById('wiStation').value;
    const units = parseInt(document.getElementById('wiUnits').value, 10) || 1;
    const timeVal = document.getElementById('wiTime').value;

    if (!timeVal) { alert('Please enter a start time.'); return; }

    const [h, min] = timeVal.split(':').map(Number);
    const startMinutes = h * 60 + min;

    await addDoc(collection(db, 'walkins'), {
      station,
      units,
      startTime: timeVal,
      startMinutes,
      date: todayStr(),   // ← NEW: needed for date-scoped availability queries
      status: 'active',
      loggedAt: serverTimestamp(),
      completedAt: null,
    });

    // Reset units
    document.getElementById('wiUnits').value = '1';
  });
}

// ── IDENTITY VERIFICATION MODAL ───────────────────────────
// Injects a lightweight modal into the page on first use
function ensureVerifyModal() {
  if (document.getElementById('verifyModal')) return;
  const modal = document.createElement('div');
  modal.id = 'verifyModal';
  modal.style.cssText = `
    display:none;position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);
    align-items:center;justify-content:center;padding:20px;
  `;
  modal.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border-hi);border-radius:var(--r);
      padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-family:var(--f-display);font-size:1rem;letter-spacing:0.06em;
        color:var(--blue);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-shield-halved"></i> VERIFY CUSTOMER
      </div>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:20px;" id="verifyBookingMeta"></div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;font-family:var(--f-heading);
        text-transform:uppercase;letter-spacing:0.1em;">
        Ask the customer for their name <em>or</em> phone number
      </div>
      <input id="verifyInput" placeholder="Type what customer says…"
        style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);
          padding:11px 14px;color:var(--text);font-family:var(--f-body);font-size:0.95rem;
          outline:none;width:100%;margin-bottom:8px;transition:border-color 0.2s;" />
      <div id="verifyError" style="display:none;color:var(--pink);font-size:0.78rem;
        margin-bottom:10px;padding:8px 12px;background:rgba(255,45,120,0.08);
        border-radius:var(--r-sm);border:1px solid rgba(255,45,120,0.2);">
        <i class="fa-solid fa-circle-xmark"></i> Name or phone doesn't match — please double-check.
      </div>
      <div style="display:flex;gap:10px;margin-top:4px;">
        <button id="verifyCancelBtn" style="flex:1;padding:10px;border-radius:var(--r-sm);
          border:1px solid var(--border);background:transparent;color:var(--text-muted);
          font-family:var(--f-heading);font-size:0.78rem;letter-spacing:0.06em;
          text-transform:uppercase;cursor:pointer;">Cancel</button>
        <button id="verifyConfirmBtn" style="flex:2;padding:10px;border-radius:var(--r-sm);
          border:none;background:var(--green);color:#000;font-family:var(--f-heading);
          font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase;
          cursor:pointer;font-weight:700;">✓ Confirm &amp; Complete</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('verifyCancelBtn').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('verifyInput').addEventListener('focus', function () {
    this.style.borderColor = 'var(--blue)';
  });
  document.getElementById('verifyInput').addEventListener('blur', function () {
    this.style.borderColor = 'var(--border)';
  });
  document.getElementById('verifyInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('verifyConfirmBtn').click();
  });
}

function openVerifyModal(booking, onSuccess) {
  ensureVerifyModal();
  const modal = document.getElementById('verifyModal');
  const input = document.getElementById('verifyInput');
  const errEl = document.getElementById('verifyError');
  const metaEl = document.getElementById('verifyBookingMeta');
  const confirmBtn = document.getElementById('verifyConfirmBtn');

  input.value = '';
  errEl.style.display = 'none';
  metaEl.innerHTML = `<strong style="color:var(--text)">${booking.ref || ''}</strong>
    &nbsp;·&nbsp;${STATION_NAMES[booking.station] || booking.station}
    &nbsp;·&nbsp;${booking.date} ${booking.time}`;

  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 80);

  // Replace confirm listener each time
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.replaceWith(newBtn);
  newBtn.addEventListener('click', () => {
    const val = input.value.trim().toLowerCase();
    if (!val) { errEl.style.display = ''; return; }
    const nameMatch = booking.name && booking.name.toLowerCase().includes(val);
    const phoneMatch = booking.phone && booking.phone.replace(/\s/g, '').includes(val.replace(/\s/g, ''));
    if (nameMatch || phoneMatch) {
      modal.style.display = 'none';
      onSuccess();
    } else {
      errEl.style.display = '';
      input.select();
    }
  });
}


function updateStats() {
  const today = todayStr();

  // Today's bookings (any status)
  const todayBookings = allBookings.filter(b => b.date === today);
  document.getElementById('statTotal').textContent = todayBookings.length;

  // Active walk-ins
  document.getElementById('statWalkins').textContent = activeWalkins.length;

  // Stations occupied NOW (active walk-ins + current-time bookings)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const bookedNow = allBookings.filter(b => {
    if (b.date !== today || b.status === 'completed') return false;
    const [bh, bm] = (b.time || '0:0').split(':').map(Number);
    const startM = bh * 60 + bm;
    const endM = startM + (b.duration || 1) * 60;
    return nowMin >= startM && nowMin < endM;
  });

  let occupied = 0;
  bookedNow.forEach(b => { occupied += (b.units || 1); });
  activeWalkins.forEach(w => { occupied += (w.units || 1); });

  document.getElementById('statOccupied').textContent = occupied;
}