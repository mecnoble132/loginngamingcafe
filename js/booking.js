/* ============================================================
   LOGINN GAMING CAFE -- js/booking.js
   Fixes: (1) past slots blocked, (2) Firestore permissions graceful,
          (3) EmailJS to_email explicit per send call
============================================================ */
'use strict';

import { db, EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID,
         EMAILJS_CUSTOMER_TMPL, EMAILJS_ADMIN_TMPL,
         ADMIN_NOTIFY_EMAIL }
  from './firebase-config.js';

import { collection, addDoc, getDocs, query,
         where, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// -- STATION CONFIG --------------------------------------------
const STATIONS = {
  'standard-pc':    { name: 'Standard PC',       type: 'pc',      capacity: 10, maxUnits: 10, hasPluralUnits: true  },
  'performance-pc': { name: 'Performance PC',    type: 'pc',      capacity: 5,  maxUnits: 5,  hasPluralUnits: true  },
  'story-pc':       { name: 'Story / Casual PC', type: 'pc',      capacity: 1,  maxUnits: 1,  hasPluralUnits: false },
  'ps5':            { name: 'PlayStation 5',     type: 'console', capacity: 3,  maxPlayers: 4, hasPlayers: true },
  'xbox':           { name: 'Xbox Series',       type: 'console', capacity: 1,  maxPlayers: 4, hasPlayers: true },
  'ps5-sim':        { name: 'PS5 Racing SIM',    type: 'sim',     capacity: 1,  maxUnits: 1,  hasPluralUnits: false },
  'pc-sim':         { name: 'PC Racing SIM',     type: 'sim',     capacity: 1,  maxUnits: 1,  hasPluralUnits: false },
};

// -- PRICING ---------------------------------------------------
const FIRST_HR   = 150;
const EXTRA_HR   = 100;
const CTRL_FEE   = 50;
const PC_DAY_CAP = 600;

function calcPrice(station, units, players, hours) {
  const cfg = STATIONS[station];
  let total = 0, breakdown = '';

  if (cfg.type === 'pc') {
    const perUnit = Math.min(FIRST_HR + Math.max(0, hours - 1) * EXTRA_HR, PC_DAY_CAP);
    total         = perUnit * units;
    const capped  = (FIRST_HR + Math.max(0, hours - 1) * EXTRA_HR) > PC_DAY_CAP;
    breakdown     = capped
      ? `${units} PC${units > 1 ? 's' : ''} x Rs.${PC_DAY_CAP} (day cap)`
      : `${units} PC${units > 1 ? 's' : ''} x (Rs.${FIRST_HR} + Rs.${EXTRA_HR}x${Math.max(0, hours - 1)}hr${hours > 2 ? 's' : ''})`;
  } else {
    const extraCtrl  = Math.max(0, players - 1);
    const firstHrAmt = FIRST_HR + extraCtrl * CTRL_FEE;
    const laterHrAmt = EXTRA_HR  + extraCtrl * CTRL_FEE;
    total            = firstHrAmt + Math.max(0, hours - 1) * laterHrAmt;
    breakdown        = hours === 1
      ? `Rs.${firstHrAmt} for 1st hr - ${players} player${players > 1 ? 's' : ''}`
      : `Rs.${firstHrAmt} + Rs.${laterHrAmt}x${hours - 1}hr${hours > 2 ? 's' : ''} - ${players} players`;
  }
  return { total, breakdown };
}

// -- STATE -----------------------------------------------------
let state = { station: null, units: 1, players: 1, date: null, time: null, duration: 1 };

// -- STEP NAVIGATION -------------------------------------------
const steps = [null, 'step1', 'step2', 'step3', 'step4', 'stepSuccess'];
let currentStep = 1;

function goTo(n) {
  document.getElementById(steps[currentStep])?.classList.remove('active');
  currentStep = n;
  document.getElementById(steps[currentStep])?.classList.add('active');
  document.querySelectorAll('.step-item').forEach(el => {
    const s = +el.dataset.step;
    el.classList.toggle('active', s === n);
    el.classList.toggle('done',   s < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -- STEP 1 -- STATION -----------------------------------------
const step1Next = document.getElementById('step1Next');

document.querySelectorAll('.station-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.station-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.station  = card.dataset.station;
    step1Next.disabled = false;
  });
});

step1Next.addEventListener('click', () => { buildStep2(); goTo(2); });

// -- STEP 2 -- UNITS / PLAYERS ---------------------------------
function buildStep2() {
  const cfg  = STATIONS[state.station];
  const wrap = document.getElementById('unitsWrap');
  const sub  = document.getElementById('step2Sub');
  wrap.innerHTML = '';

  if (!cfg.hasPluralUnits && !cfg.hasPlayers) {
    state.units = 1; state.players = 1;
    wrap.innerHTML = `<div class="units-fixed-note"><i class="fa-solid fa-circle-check"></i><span>Single pod - 1 player only.</span></div>`;
    sub.textContent = 'This is a single-unit station.';
    return;
  }

  if (cfg.hasPlayers) {
    sub.textContent = 'Select how many players. Extra controllers are Rs.50/hr each beyond the 1st.';
    wrap.innerHTML  = `<div class="units-label">Number of Players</div><div class="units-options" id="playerOpts"></div><div class="units-price-note" id="ctrlNote"></div>`;
    const opts = document.getElementById('playerOpts');
    for (let i = 1; i <= cfg.maxPlayers; i++) {
      const btn = document.createElement('button');
      btn.className = 'unit-btn' + (i === 1 ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => {
        opts.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.players = i;
        updateCtrlNote();
      });
      opts.appendChild(btn);
    }
    state.players = 1;
    updateCtrlNote();
  } else {
    sub.textContent = 'Select how many PCs you need. Each PC is billed separately.';
    wrap.innerHTML  = `<div class="units-label">Number of PCs</div><div class="units-options" id="unitOpts"></div><div class="units-price-note">Each PC billed independently - Day cap Rs.600/PC</div>`;
    const opts = document.getElementById('unitOpts');
    for (let i = 1; i <= cfg.maxUnits; i++) {
      const btn = document.createElement('button');
      btn.className = 'unit-btn' + (i === 1 ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => {
        opts.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.units = i;
      });
      opts.appendChild(btn);
    }
    state.units = 1;
  }
}

function updateCtrlNote() {
  const note  = document.getElementById('ctrlNote');
  if (!note) return;
  const extra = state.players - 1;
  note.textContent = extra > 0
    ? `+Rs.${extra * CTRL_FEE}/hr for ${extra} extra controller${extra > 1 ? 's' : ''}`
    : 'No extra controller charge for 1 player.';
}

document.getElementById('step2Back').addEventListener('click', () => goTo(1));
document.getElementById('step2Next').addEventListener('click', () => { buildTimeGrid(); goTo(3); });

// -- STEP 3 -- DATE / TIME / DURATION --------------------------
const dateInput  = document.getElementById('bookingDate');
const durDisplay = document.getElementById('durDisplay');
const timeGrid   = document.getElementById('timeGrid');
const slotHint   = document.getElementById('slotHint');

// Use local date string (not UTC) — fixes IST timezone mismatch
function getLocalDateStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

const todayStr  = getLocalDateStr();
dateInput.min   = todayStr;
dateInput.value = todayStr;
state.date      = todayStr;

document.getElementById('durUp').addEventListener('click', () => {
  if (state.duration < 12) {
    state.duration++;
    durDisplay.textContent = `${state.duration} hr${state.duration > 1 ? 's' : ''}`;
    state.time = null;
    document.getElementById('step3Next').disabled = true;
    rebuildSlots();
  }
});
document.getElementById('durDown').addEventListener('click', () => {
  if (state.duration > 1) {
    state.duration--;
    durDisplay.textContent = `${state.duration} hr${state.duration > 1 ? 's' : ''}`;
    state.time = null;
    document.getElementById('step3Next').disabled = true;
    rebuildSlots();
  }
});

dateInput.addEventListener('change', () => {
  state.date = dateInput.value;
  state.time = null;
  document.getElementById('step3Next').disabled = true;
  buildTimeGrid();
});

function buildTimeGrid() {
  timeGrid.innerHTML = '<div class="time-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading available slots...</div>';
  updatePriceLive();
  fetchOccupied().then(rebuildSlots);
}

function latestStartMinutes() { return 23 * 60 - state.duration * 60; }

let occupiedRanges = [];

async function fetchOccupied() {
  occupiedRanges = [];
  if (!state.station || !state.date) return;
  const cfg = STATIONS[state.station];

  try {
    const bSnap = await getDocs(query(
      collection(db, 'bookings'),
      where('station', '==', state.station),
      where('date',    '==', state.date)
    ));
    const wSnap = await getDocs(query(
      collection(db, 'walkins'),
      where('station', '==', state.station),
      where('status',  '==', 'active')
    ));

    const slotCount = {};
    function markRange(startMin, endMin, count) {
      for (let m = startMin; m < endMin; m += 10) slotCount[m] = (slotCount[m] || 0) + count;
    }

    bSnap.forEach(d => {
      const data     = d.data();
      const [h, min] = data.time.split(':').map(Number);
      markRange(h * 60 + min, h * 60 + min + data.duration * 60, data.units || 1);
    });
    wSnap.forEach(d => {
      const data = d.data();
      markRange(data.startMinutes, 23 * 60, data.units || 1);
    });

    const cap = cfg.capacity;
    for (let m = 11 * 60; m < 23 * 60; m += 10) {
      if ((slotCount[m] || 0) >= cap) occupiedRanges.push({ start: m, end: m + 10 });
    }
  } catch (e) {
    // FIX 2: If Firestore rules block public reads, silently proceed
    // Update Firestore rules to allow public reads on bookings + walkins
    console.warn('fetchOccupied warning:', e.message);
  }
}

function isBlocked(startMin) {
  const endMin = startMin + state.duration * 60;
  for (let m = startMin; m < endMin; m += 10) {
    if (occupiedRanges.some(r => m >= r.start && m < r.end)) return true;
  }
  return false;
}

function rebuildSlots() {
  const latest = latestStartMinutes();
  slotHint.textContent = 'Sessions must finish by 11 PM';
  timeGrid.innerHTML   = '';

  // FIX 1: Block past time slots when today is selected
  // Compare against local date (not UTC) to handle IST correctly
  const isToday    = state.date === getLocalDateStr();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  let anyAvailable = false;
  for (let m = 11 * 60; m <= latest; m += 10) {
    const isPast  = isToday && m <= nowMinutes;
    const blocked = isPast || isBlocked(m);
    if (!blocked) anyAvailable = true;

    const label = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const btn   = document.createElement('button');
    btn.className   = 'time-slot' + (blocked ? ' blocked' : '');
    btn.textContent = label;
    btn.disabled    = blocked;

    if (!blocked) {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.time = label;
        document.getElementById('step3Next').disabled = false;
        updatePriceLive();
      });
    }
    if (state.time === label && !blocked) btn.classList.add('selected');
    timeGrid.appendChild(btn);
  }

  if (!anyAvailable) {
    timeGrid.innerHTML = '<div class="time-loading">No slots available for this date. Try another date or duration.</div>';
  }
}

function updatePriceLive() {
  const live = document.getElementById('priceLive');
  if (!state.station || !state.duration) { live.style.display = 'none'; return; }
  const { total, breakdown } = calcPrice(state.station, state.units, state.players, state.duration);
  document.getElementById('priceLiveAmount').textContent    = `Rs.${total}`;
  document.getElementById('priceLiveBreakdown').textContent = breakdown;
  live.style.display = '';
}

document.getElementById('step3Back').addEventListener('click', () => goTo(2));
document.getElementById('step3Next').addEventListener('click', () => { buildSummary(); goTo(4); });

// -- STEP 4 -- DETAILS + SUBMIT --------------------------------
function buildSummary() {
  const cfg = STATIONS[state.station];
  const { total } = calcPrice(state.station, state.units, state.players, state.duration);

  const unitsLabel = cfg.hasPlayers
    ? `${state.players} player${state.players > 1 ? 's' : ''}`
    : cfg.hasPluralUnits ? `${state.units} PC${state.units > 1 ? 's' : ''}` : '1 unit';

  const rows = [
    ['Station',  cfg.name],
    ['Units',    unitsLabel],
    ['Date',     formatDate(state.date)],
    ['Time',     state.time],
    ['Duration', `${state.duration} hr${state.duration > 1 ? 's' : ''}`],
  ];

  document.getElementById('summaryRows').innerHTML =
    rows.map(([k, v]) => `<div class="summary-row"><span>${k}</span><span>${v}</span></div>`).join('');
  document.getElementById('summaryTotal').textContent = `Rs.${total}`;
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${+day} ${months[+m - 1]} ${y}`;
}

document.getElementById('step4Back').addEventListener('click', () => goTo(3));

document.getElementById('submitBtn').addEventListener('click', async () => {
  const name  = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const notes = document.getElementById('custNotes').value.trim();

  let valid = true;
  [['custName', name], ['custPhone', phone], ['custEmail', email]].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!val) { el.classList.add('error'); valid = false; }
    else el.classList.remove('error');
  });
  if (!valid) return;

  const btn = document.getElementById('submitBtn');
  btn.disabled  = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Booking...';

  const cfg = STATIONS[state.station];
  const { total, breakdown } = calcPrice(state.station, state.units, state.players, state.duration);
  const refId = 'LGN' + Date.now().toString(36).toUpperCase();

  const unitsLabel = cfg.hasPlayers
    ? `${state.players} player${state.players > 1 ? 's' : ''}`
    : cfg.hasPluralUnits ? `${state.units} PC${state.units > 1 ? 's' : ''}` : '1 unit';

  try {
    // 1. Save to Firestore
    await addDoc(collection(db, 'bookings'), {
      ref: refId, name, phone, email, notes,
      station:     state.station,
      stationName: cfg.name,
      units:       state.units,
      players:     state.players,
      unitsLabel,
      date:        state.date,
      time:        state.time,
      duration:    state.duration,
      totalPrice:  total,
      status:      'booked',
      createdAt:   serverTimestamp(),
    });

    // 2. FIX 3: Explicitly set to_email for each send call separately
    emailjs.init(EMAILJS_PUBLIC_KEY);

    const baseParams = {
      to_name:     name,
      phone,
      ref_id:      refId,
      station:     cfg.name,
      units_label: unitsLabel,
      date:        formatDate(state.date),
      time:        state.time,
      duration:    `${state.duration} hr${state.duration > 1 ? 's' : ''}`,
      total_price: `Rs.${total}`,
      breakdown,
      notes:       notes || 'None',
    };

    // Customer confirmation — to_email is the customer's address
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CUSTOMER_TMPL, {
      ...baseParams,
      to_email: email,
    });

    // Admin notification — to_email is the fixed admin address
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TMPL, {
      ...baseParams,
      to_email: ADMIN_NOTIFY_EMAIL,
    });

    // 3. Show success screen
    document.getElementById('successRef').textContent = refId;
    goTo(5);

  } catch (err) {
    console.error('Booking error', err);
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Confirm Booking';
    alert('Something went wrong. Please try again or call us at +91 80757 07064.');
  }
});

// -- INIT ------------------------------------------------------
buildTimeGrid();