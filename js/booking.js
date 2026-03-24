
import { db } from '../js/firebase-config.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const STATIONS = {
  'standard-pc': { name: 'Standard PC', type: 'pc', capacity: 10, maxUnits: 10, hasPlayers: false },
  'performance-pc': { name: 'Performance PC', type: 'pc', capacity: 5, maxUnits: 5, hasPlayers: false },
  'story-pc': { name: 'Story / Casual PC', type: 'pc', capacity: 1, maxUnits: 1, hasPlayers: false },
  'ps5': { name: 'PlayStation 5', type: 'console', capacity: 3, maxPlayers: 4, hasPlayers: true },
  'xbox': { name: 'Xbox Series', type: 'console', capacity: 1, maxPlayers: 4, hasPlayers: true },
  'ps5-sim': { name: 'PS5 Racing SIM', type: 'sim', capacity: 1, maxUnits: 1, hasPlayers: false },
  'pc-sim': { name: 'PC Racing SIM', type: 'sim', capacity: 1, maxUnits: 1, hasPlayers: false },
};
const FIRST_HR = 150, EXTRA_HR = 100, CTRL_FEE = 50, PC_DAY_CAP = 600;

function calcPrice(id, units, players, hours) {
  const cfg = STATIONS[id];
  if (cfg.type === 'pc') {
    return { total: Math.min(FIRST_HR + Math.max(0, hours - 1) * EXTRA_HR, PC_DAY_CAP) * units };
  } else {
    const extra = Math.max(0, players - 1);
    return { total: (FIRST_HR + extra * CTRL_FEE) + Math.max(0, hours - 1) * (EXTRA_HR + extra * CTRL_FEE) };
  }
}

const state = { station: null, units: 1, players: 1, date: null, time: null, duration: 1 };
let currentStep = 1;
let occupiedMins = new Set();

function getLocalDateStr(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${+day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]}`;
}

function goTo(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  const panels = [null, 'step1', 'step2', 'step3', 'step4', 'step5', 'stepSuccess'];
  document.getElementById(panels[n])?.classList.add('active');
  document.querySelectorAll('.step-tab').forEach(tab => {
    const s = +tab.dataset.step;
    tab.classList.toggle('active', s === n); tab.classList.toggle('done', s < n);
  });
  currentStep = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateBottomBar();
}

const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');
const bottomLabel = document.getElementById('bottomLabel');
const bottomVal = document.getElementById('bottomVal');
const bottomBar = document.getElementById('bottomBar');

function updateBottomBar() {
  bottomBar.style.display = currentStep === 6 ? 'none' : '';
  btnBack.style.display = currentStep > 1 && currentStep < 6 ? '' : 'none';
  const cfg = state.station ? STATIONS[state.station] : null;
  const labels = ['', 'Select a station', 'Select players', 'Choose a date', 'Pick a time slot', 'Review your booking'];
  bottomLabel.textContent = labels[currentStep] || '';
  if (currentStep === 1) { bottomVal.textContent = cfg?.name || '—'; btnNext.disabled = !state.station; btnNext.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>'; }
  else if (currentStep === 2) { bottomVal.textContent = `${cfg.name} · ${cfg.hasPlayers ? state.players + ' player' + (state.players > 1 ? 's' : '') : state.units + ' unit' + (state.units > 1 ? 's' : '')}`; btnNext.disabled = false; btnNext.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>'; }
  else if (currentStep === 3) { bottomVal.textContent = state.date ? formatDate(state.date) + ` · ${state.duration} hr${state.duration > 1 ? 's' : ''}` : '—'; btnNext.disabled = !state.date; btnNext.innerHTML = 'Find Slots <i class="fa-solid fa-arrow-right"></i>'; }
  else if (currentStep === 4) { bottomVal.textContent = state.time ? `${state.time} · ${state.duration} hr${state.duration > 1 ? 's' : ''}` : 'No slot selected'; btnNext.disabled = !state.time; btnNext.innerHTML = 'Review <i class="fa-solid fa-arrow-right"></i>'; }
  else if (currentStep === 5) { const { total } = calcPrice(state.station, state.units, state.players, state.duration); bottomVal.textContent = `₹${total} estimated`; btnNext.disabled = false; btnNext.innerHTML = '<i class="fa-solid fa-lock"></i> Block Slot'; }
}

document.querySelectorAll('.stn-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.stn-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected'); state.station = card.dataset.station; updateBottomBar();
  });
});

function buildStep2() {
  const cfg = STATIONS[state.station];
  document.getElementById('step2Sub').textContent = cfg.hasPlayers ? 'Extra controllers: +₹50/hr each beyond 1st player' : cfg.maxUnits > 1 ? 'Select the number of PCs you need' : 'Single unit — 1 player only';
  const content = document.getElementById('step2Content'); content.innerHTML = '';
  if (!cfg.hasPlayers && cfg.maxUnits === 1) { content.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--green);font-family:var(--f-heading);font-size:1.1rem;"><i class="fa-solid fa-circle-check" style="font-size:2rem;display:block;margin-bottom:12px;"></i>Single pod — all set!</div>`; state.units = 1; state.players = 1; return; }
  const max = cfg.hasPlayers ? cfg.maxPlayers : cfg.maxUnits;
  const grid = document.createElement('div'); grid.className = 'players-grid';
  for (let i = 1; i <= max; i++) {
    const btn = document.createElement('button'); btn.className = 'player-btn' + (i === 1 ? ' active' : '');
    btn.innerHTML = `${i}<small>${cfg.hasPlayers ? 'player' + (i > 1 ? 's' : '') : 'PC' + (i > 1 ? 's' : '')}</small>`;
    btn.addEventListener('click', () => { grid.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); cfg.hasPlayers ? state.players = i : state.units = i; updateBottomBar(); });
    grid.appendChild(btn);
  }
  content.appendChild(grid);
  if (cfg.hasPlayers) state.players = 1; else state.units = 1;
}

function buildDateStrip() {
  const strip = document.getElementById('dateStrip'); strip.innerHTML = '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const dateStr = getLocalDateStr(i); const d = new Date(dateStr + 'T00:00:00');
    const chip = document.createElement('div'); chip.className = 'date-chip' + (i === 0 ? ' active' : '');
    chip.innerHTML = `<span class="day-name">${days[d.getDay()]}</span><span class="day-num">${d.getDate()}</span>`;
    chip.addEventListener('click', () => { document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); state.date = dateStr; state.time = null; updateBottomBar(); });
    strip.appendChild(chip);
  }
  state.date = getLocalDateStr(0);
}

document.querySelectorAll('.dur-chip').forEach(chip => {
  chip.addEventListener('click', () => { document.querySelectorAll('.dur-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); state.duration = +chip.dataset.dur; state.time = null; updateBottomBar(); });
});

async function buildSlots() {
  ['slotsMorning', 'slotsAfternoon', 'slotsEvening'].forEach(id => { document.getElementById(id).innerHTML = `<div class="slots-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading…</div>`; });
  document.getElementById('step4Sub').textContent = `${formatDate(state.date)} · ${state.duration} hr${state.duration > 1 ? 's' : ''}`;
  await fetchOccupied();
  const isToday = state.date === getLocalDateStr(0);
  const now = new Date(); const nowMins = now.getHours() * 60 + now.getMinutes();
  const latest = 23 * 60 - state.duration * 60;
  const morning = [], afternoon = [], evening = [];
  for (let m = 11 * 60; m <= latest; m += 10) {
    const isPast = isToday && m <= nowMins; const isBooked = isSlotBlocked(m);
    const hh = String(Math.floor(m / 60)).padStart(2, '0'); const mm = String(m % 60).padStart(2, '0');
    const slot = { m, label: `${hh}:${mm}`, isPast, isBooked };
    if (m < 14 * 60) morning.push(slot); else if (m < 18 * 60) afternoon.push(slot); else evening.push(slot);
  }
  renderSlots('slotsMorning', morning); renderSlots('slotsAfternoon', afternoon); renderSlots('slotsEvening', evening);
}

function renderSlots(id, slots) {
  const el = document.getElementById(id); el.innerHTML = '';
  if (!slots.length) { el.innerHTML = `<div class="slots-loading" style="grid-column:1/-1;font-size:0.72rem;padding:12px;">None in this period</div>`; return; }
  slots.forEach(({ m, label, isPast, isBooked }) => {
    const btn = document.createElement('button'); btn.className = 'slot-btn'; btn.textContent = label;
    if (isPast || isBooked) { btn.disabled = true; if (isBooked) btn.classList.add('booked'); }
    else { btn.addEventListener('click', () => { document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); state.time = label; updateBottomBar(); }); }
    if (state.time === label && !isPast && !isBooked) btn.classList.add('selected');
    el.appendChild(btn);
  });
}

async function fetchOccupied() {
  occupiedMins = new Set();
  if (!state.station || !state.date) return;
  const cfg = STATIONS[state.station];
  try {
    const [bSnap, wSnap] = await Promise.all([
      getDocs(query(collection(db, 'bookings'), where('station', '==', state.station), where('date', '==', state.date))),
      getDocs(query(collection(db, 'walkins'), where('station', '==', state.station), where('status', '==', 'active')))
    ]);
    const slotCount = {};
    function mark(s, e, c) { for (let m = s; m < e; m += 10)slotCount[m] = (slotCount[m] || 0) + c; }
    bSnap.forEach(d => { const data = d.data(); if (data.status === 'cancelled') return; const [h, min] = data.time.split(':').map(Number); mark(h * 60 + min, h * 60 + min + data.duration * 60, data.units || 1); });
    wSnap.forEach(d => { const data = d.data(); mark(data.startMinutes, 23 * 60, data.units || 1); });
    for (let m = 11 * 60; m < 23 * 60; m += 10) { if ((slotCount[m] || 0) >= cfg.capacity) occupiedMins.add(m); }
  } catch (e) { console.warn('fetchOccupied:', e.message); }
}

function isSlotBlocked(startM) {
  for (let m = startM; m < startM + state.duration * 60; m += 10) { if (occupiedMins.has(m)) return true; } return false;
}

function buildConfirm() {
  const cfg = STATIONS[state.station];
  const { total } = calcPrice(state.station, state.units, state.players, state.duration);
  const unitsLabel = cfg.hasPlayers ? `${state.players} player${state.players > 1 ? 's' : ''}` : `${state.units} unit${state.units > 1 ? 's' : ''}`;
  const rows = [['Station', cfg.name], ['Players/Units', unitsLabel], ['Date', formatDate(state.date)], ['Time', state.time], ['Duration', `${state.duration} hr${state.duration > 1 ? 's' : ''}`]];
  document.getElementById('confirmRows').innerHTML = rows.map(([k, v]) => `<div class="confirm-row"><span class="confirm-row-label">${k}</span><span class="confirm-row-val">${v}</span></div>`).join('');
  document.getElementById('confirmTotal').textContent = `₹${total}`;
}

async function submitBooking() {
  btnNext.disabled = true; btnNext.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Blocking…';
  const cfg = STATIONS[state.station];
  const { total } = calcPrice(state.station, state.units, state.players, state.duration);
  const refId = 'LGN' + Date.now().toString(36).toUpperCase();
  try {
    await addDoc(collection(db, 'bookings'), { ref: refId, station: state.station, stationName: cfg.name, units: state.units, players: state.players, date: state.date, time: state.time, duration: state.duration, totalPrice: total, status: 'booked', createdAt: serverTimestamp() });
    document.getElementById('successRef').textContent = refId;
    goTo(6);
  } catch (err) {
    console.error(err); btnNext.disabled = false; btnNext.innerHTML = '<i class="fa-solid fa-lock"></i> Block Slot';
    alert('Something went wrong. Please try again or call us: +91 80757 07064');
  }
}

btnNext.addEventListener('click', async () => {
  if (currentStep === 1 && state.station) { buildStep2(); goTo(2); }
  else if (currentStep === 2) { buildDateStrip(); goTo(3); }
  else if (currentStep === 3 && state.date) { await buildSlots(); goTo(4); }
  else if (currentStep === 4 && state.time) { buildConfirm(); goTo(5); }
  else if (currentStep === 5) { await submitBooking(); }
});
btnBack.addEventListener('click', () => { if (currentStep > 1) goTo(currentStep - 1); });

updateBottomBar();
