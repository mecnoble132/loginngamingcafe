/* ============================================================
   LOGINN GAMING CAFE — js/admin.js
   Admin dashboard: Games & Blog Posts management
   Uses admin.css design system (modals, branded cards, toasts)
============================================================ */
'use strict';

import { supabase } from './supabase-config.js';
import { FALLBACK_GAMES } from './games.js';
import { slugify, sanitizePostHtml, uploadPostImage } from './posts.js';

// ── Row <-> UI shape mapping (Postgres uses snake_case) ──────
function gameToRow(g) {
  return {
    title: g.title,
    cover_id: g.coverId,
    genre: g.genre,
    color: g.color,
    tags: g.tags,
    platform: g.platform,
    ...(('featuredInCategory' in g) ? { featured_in_category: g.featuredInCategory } : {}),
  };
}
function rowToGame(r) {
  return {
    id: r.id, title: r.title, coverId: r.cover_id, genre: r.genre,
    color: r.color, tags: r.tags || [], platform: r.platform || [],
    featuredInCategory: r.featured_in_category || {},
  };
}

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

function applyAuthState(session) {
  if (session && session.user) {
    loginScreen.style.display = 'none';
    dashboard.style.display = '';
    document.getElementById('adminEmail').textContent = session.user.email;
    initDashboard();
  } else {
    loginScreen.style.display = '';
    dashboard.style.display = 'none';
  }
}

// Check current session on load, then react to future changes
// (login, logout, token refresh) — replaces onAuthStateChanged.
supabase.auth.getSession().then(({ data }) => applyAuthState(data.session));
supabase.auth.onAuthStateChange((_event, session) => applyAuthState(session));

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    errEl.textContent = 'Invalid email or password.';
    errEl.style.display = '';
  }
});

document.getElementById('loginPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('logoutBtn').addEventListener('click', () => supabase.auth.signOut());

// ══════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ══════════════════════════════════════════════════════════
// TOAST SYSTEM
// ══════════════════════════════════════════════════════════
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ══════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ══════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════
let allGames = [];
let allPosts = [];
let dashboardInitialized = false;

function initDashboard() {
  if (dashboardInitialized) return;
  dashboardInitialized = true;
  listenGames();
  listenPosts();
  setupGameModal();
  setupPostModal();
  setupRefresh();
  setupFeaturedTab();
}

// ══════════════════════════════════════════════════════════
// GAMES
// ══════════════════════════════════════════════════════════

async function fetchGames() {
  const { data, error } = await supabase.from('games').select('*').order('title', { ascending: true });
  if (error) throw error;
  allGames = (data || []).map(rowToGame);
  renderGames();
  renderFeatured();
  updateStats();
}

function listenGames() {
  fetchGames().catch(err => {
    console.warn('Games error:', err.message);
    document.getElementById('gamesListPanel').innerHTML =
      '<div class="table-empty"><i class="fa-solid fa-triangle-exclamation"></i> Error loading games</div>';
  });

  // Realtime subscription — replaces Firestore's onSnapshot.
  supabase
    .channel('admin-games')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
      fetchGames().catch(err => console.warn('Games refresh error:', err.message));
    })
    .subscribe();
}

function renderGames(filter = '') {
  const el = document.getElementById('gamesListPanel');
  const q = filter.toLowerCase();
  const filtered = q
    ? allGames.filter(g =>
        g.title.toLowerCase().includes(q) ||
        (g.genre || '').toLowerCase().includes(q) ||
        (g.tags || []).some(t => t.toLowerCase().includes(q)))
    : allGames;

  if (!filtered.length) {
    el.innerHTML = `<div class="table-empty">${q ? 'No games match your search.' : 'No games yet. Click "Add Game" to start!'}</div>`;
    return;
  }

  el.innerHTML = filtered.map(g => {
    const coverUrl = g.coverId
      ? `https://images.igdb.com/igdb/image/upload/t_cover_small_2x/${g.coverId}.jpg`
      : null;
    const coverHtml = coverUrl
      ? `<div class="agc-cover"><img src="${coverUrl}" alt="${g.title}" onerror="this.parentElement.style.background='var(--bg-card)'"></div>`
      : `<div class="agc-cover" style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);"><i class="fa-solid fa-gamepad" style="color:var(--text-dim);font-size:1.1rem;"></i></div>`;

    const platforms = (g.platform || []).map(p =>
      `<span class="agc-platform ${p}">${p.toUpperCase()}</span>`
    ).join('');

    const featured = g.featuredInCategory
      ? Object.keys(g.featuredInCategory).filter(k => g.featuredInCategory[k])
      : [];
    const featuredHtml = featured.length
      ? `<span style="color:var(--pink);margin-left:4px;"><i class="fa-solid fa-star" style="font-size:0.55rem;"></i></span>`
      : '';

    return `
      <div class="admin-game-card" data-id="${g.id}">
        ${coverHtml}
        <div class="agc-info">
          <div class="agc-title">${g.title}${featuredHtml}</div>
          <div class="agc-meta">
            <span style="color:${g.color || 'var(--text-muted)'}"><i class="fa-solid fa-circle" style="font-size:0.4rem;vertical-align:middle;margin-right:3px;"></i>${g.genre || '—'}</span>
            ${platforms}
          </div>
        </div>
        <div class="agc-actions">
          <button class="action-btn action-edit game-edit" data-id="${g.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn action-delete game-delete" data-id="${g.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.game-edit').forEach(btn =>
    btn.addEventListener('click', () => editGame(btn.dataset.id))
  );
  el.querySelectorAll('.game-delete').forEach(btn =>
    btn.addEventListener('click', () => confirmDelete('games', btn.dataset.id, 'game'))
  );
}

// Search
document.getElementById('gameSearch')?.addEventListener('input', e => {
  renderGames(e.target.value);
});

// ── Game Modal ────────────────────────────────────────────
function setupGameModal() {
  document.getElementById('addGameBtn').addEventListener('click', () => {
    resetGameForm();
    document.getElementById('gameModalTitle').innerHTML =
      '<i class="fa-solid fa-gamepad" style="color:var(--blue)"></i> Add Game';
    openModal('gameModal');
  });

  document.getElementById('gameModalClose').addEventListener('click', () => closeModal('gameModal'));
  document.getElementById('gameModalCancel').addEventListener('click', () => closeModal('gameModal'));

  // Quick ID Finder & Auto-extraction
  const coverInput = document.getElementById('gameCoverId');
  const titleInput = document.getElementById('gameTitle');
  const searchLink = document.getElementById('searchIgdbLink');

  const updateSearchLink = () => {
    const title = titleInput.value.trim();
    if (title.length > 1) {
      searchLink.href = `https://www.igdb.com/search?q=${encodeURIComponent(title)}`;
      searchLink.style.display = 'inline-block';
    } else {
      searchLink.style.display = 'none';
    }
  };

  titleInput.addEventListener('input', updateSearchLink);

  coverInput.addEventListener('input', () => {
    const val = coverInput.value.trim();
    if (val.includes('igdb.com') && val.includes('/')) {
      const match = val.match(/\/([^\/.]+)\.(jpg|png|webp|jpeg)/i);
      if (match && match[1]) {
        const id = match[1].split('/').pop();
        coverInput.value = id;
        showToast('ID extracted from URL!', 'info');
      }
    }
  });

  document.getElementById('saveGameBtn').addEventListener('click', async () => {
    const title = document.getElementById('gameTitle').value.trim();
    if (!title) { showToast('Please enter a game title.', 'error'); return; }

    const data = {
      title,
      coverId: document.getElementById('gameCoverId').value.trim(),
      genre: document.getElementById('gameGenre').value.trim(),
      color: document.getElementById('gameColor').value || '#00d4ff',
      tags: document.getElementById('gameTags').value.split(',').map(t => t.trim()).filter(Boolean),
      platform: getChecked('gamePlatforms'),
    };

    const editId = document.getElementById('gameEditId').value;
    try {
      if (editId) {
        const { error } = await supabase.from('games').update(gameToRow(data)).eq('id', editId);
        if (error) throw error;
        showToast(`"${title}" updated!`);
      } else {
        data.featuredInCategory = null;
        const { error } = await supabase.from('games').insert(gameToRow(data));
        if (error) throw error;
        showToast(`"${title}" added!`);
      }
      closeModal('gameModal');
    } catch (e) {
      showToast('Error saving game: ' + e.message, 'error');
    }
  });
}

function editGame(id) {
  const g = allGames.find(x => x.id === id);
  if (!g) return;
  document.getElementById('gameEditId').value = id;
  document.getElementById('gameTitle').value = g.title || '';
  document.getElementById('gameCoverId').value = g.coverId || '';
  document.getElementById('gameGenre').value = g.genre || '';
  document.getElementById('gameColor').value = g.color || '#00d4ff';
  document.getElementById('gameTags').value = (g.tags || []).join(', ');
  setChecked('gamePlatforms', g.platform || []);
  document.getElementById('gameModalTitle').innerHTML =
    '<i class="fa-solid fa-pen" style="color:var(--blue)"></i> Edit Game';
  
  // Update search link visibility immediately
  const titleInput = document.getElementById('gameTitle');
  const searchLink = document.getElementById('searchIgdbLink');
  if (titleInput.value.trim().length > 1) {
    searchLink.href = `https://www.igdb.com/search?q=${encodeURIComponent(titleInput.value.trim())}`;
    searchLink.style.display = 'inline-block';
  } else {
    searchLink.style.display = 'none';
  }

  openModal('gameModal');
}

function resetGameForm() {
  document.getElementById('gameEditId').value = '';
  document.getElementById('gameTitle').value = '';
  document.getElementById('gameCoverId').value = '';
  document.getElementById('gameGenre').value = '';
  document.getElementById('gameColor').value = '#00d4ff';
  document.getElementById('gameTags').value = '';
  clearChecked('gamePlatforms');
  document.getElementById('searchIgdbLink').style.display = 'none';
}

// ══════════════════════════════════════════════════════════
// FEATURED GAMES
// ══════════════════════════════════════════════════════════
const FEATURED_CATEGORIES = ['all', 'pc', 'ps5', 'xbox', 'sim'];

function setupFeaturedTab() {
  document.getElementById('saveFeaturedBtn').addEventListener('click', saveFeatured);
}

function renderFeatured() {
  const panel = document.getElementById('featuredPanel');
  if (!allGames.length) {
    panel.innerHTML = '<div class="table-empty">Add some games first to manage featured selections.</div>';
    return;
  }

  panel.innerHTML = FEATURED_CATEGORIES.map(cat => {
    const label = cat === 'all' ? 'Homepage (All)' : cat.toUpperCase();
    const icon = { all: 'fa-house', pc: 'fa-computer', ps5: 'fa-playstation', xbox: 'fa-xbox', sim: 'fa-flag-checkered' }[cat];
    const iconBrand = ['ps5', 'xbox'].includes(cat) ? 'fa-brands' : 'fa-solid';

    // Filter games that have this platform (or all games for 'all')
    const eligible = cat === 'all'
      ? allGames
      : allGames.filter(g => (g.platform || []).includes(cat));

    const items = eligible.map(g => {
      const isFeatured = g.featuredInCategory && g.featuredInCategory[cat];
      return `
        <div class="featured-item">
          <input type="checkbox" class="featured-check" data-game-id="${g.id}" data-cat="${cat}"
            ${isFeatured ? 'checked' : ''}
            style="accent-color:var(--blue);width:18px;height:18px;">
          <span class="featured-item-title">${g.title}</span>
          <span style="font-size:0.65rem;color:var(--text-dim);">${(g.platform || []).join(', ').toUpperCase()}</span>
        </div>`;
    }).join('');

    return `
      <details class="featured-section" style="margin-bottom:16px;" ${cat === 'all' ? 'open' : ''}>
        <summary class="featured-cat-header" style="cursor:pointer; user-select:none; list-style:none;">
          <style>summary::-webkit-details-marker { display:none; }</style>
          <div class="featured-cat-title"><i class="${iconBrand} ${icon}" style="font-size:0.9rem;"></i> ${label}</div>
          <div class="featured-cat-count" data-cat-label="${cat}">${eligible.filter(g => g.featuredInCategory && g.featuredInCategory[cat]).length} selected <i class="fa-solid fa-caret-down" style="margin-left:6px; opacity:0.6;"></i></div>
        </summary>
        <div class="featured-list-wrap">
          <div class="featured-list">${items || '<div class="featured-empty">No eligible games for this category</div>'}</div>
        </div>
      </details>`;
  }).join('');

  // Enforce 5-game limit
  panel.querySelectorAll('.featured-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const cat = cb.dataset.cat;
      const checkedInCat = panel.querySelectorAll(`.featured-check[data-cat="${cat}"]:checked`);
      if (checkedInCat.length > 5) {
        cb.checked = false;
        showToast('Maximum 5 games can be featured per category.', 'error');
        return;
      }
      // Update count label
      const countEl = panel.querySelector(`.featured-cat-count[data-cat-label="${cat}"]`);
      if (countEl) {
        countEl.innerHTML = `${panel.querySelectorAll(`.featured-check[data-cat="${cat}"]:checked`).length} selected <i class="fa-solid fa-caret-down" style="margin-left:6px; opacity:0.6;"></i>`;
      }
    });
  });
}

async function saveFeatured() {
  const checks = document.querySelectorAll('.featured-check');
  // Build map: gameId → { cat: true/false }
  const map = {};
  checks.forEach(cb => {
    const gid = cb.dataset.gameId;
    const cat = cb.dataset.cat;
    if (!map[gid]) map[gid] = {};
    map[gid][cat] = cb.checked;
  });

  try {
    const promises = Object.entries(map).map(([gid, cats]) => {
      // Merge with existing — only update changed categories
      const game = allGames.find(g => g.id === gid);
      const existing = game?.featuredInCategory || {};
      const merged = { ...existing, ...cats };
      // Clean: remove false keys
      Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k]; });
      return supabase.from('games').update({
        featured_in_category: Object.keys(merged).length ? merged : null
      }).eq('id', gid);
    });
    const results = await Promise.all(promises);
    const failed = results.find(r => r.error);
    if (failed) throw failed.error;
    showToast('Featured games saved!');
  } catch (e) {
    showToast('Error saving featured: ' + e.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
// REFRESH & SEEDING
// ══════════════════════════════════════════════════════════
function setupRefresh() {
  const refreshGames = async () => {
    const btn = document.getElementById('refreshGamesBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
      await fetchGames();
      showToast(`Refreshed ${allGames.length} games.`);
    } catch (e) { showToast('Refresh failed: ' + e.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i><span class="hide-mobile">Refresh</span>';
    }
  };

  document.getElementById('refreshGamesBtn').addEventListener('click', refreshGames);
  document.getElementById('refreshPostsBtn').addEventListener('click', async () => {
    await fetchPosts(); showToast(`Refreshed ${allPosts.length} posts.`);
  });
}

// ══════════════════════════════════════════════════════════
// DELETE CONFIRMATION
// ══════════════════════════════════════════════════════════
function confirmDelete(tableName, rowId, label) {
  if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
  supabase.from(tableName).delete().eq('id', rowId)
    .then(({ error }) => {
      if (error) throw error;
      showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted.`);
    })
    .catch(e => showToast('Error: ' + e.message, 'error'));
}

// ══════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════
function updateStats() {
  document.getElementById('statGames').textContent = allGames.length;
  document.getElementById('statPosts').textContent = allPosts.length;
  const featured = allGames.filter(g =>
    g.featuredInCategory && Object.values(g.featuredInCategory).some(Boolean)
  ).length;
  document.getElementById('statFeatured').textContent = featured;
}

// ══════════════════════════════════════════════════════════
// CHECKBOX HELPERS
// ══════════════════════════════════════════════════════════
function getChecked(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`))
    .map(cb => cb.value);
}

function setChecked(containerId, values) {
  document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach(cb => {
    cb.checked = values.includes(cb.value);
  });
}

function clearChecked(containerId) {
  document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach(cb => cb.checked = false);
}

/* Blog publishing */
let postQuill, slugManual = false, currentCover = '', postId;
const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function fetchPosts() { const {data,error}=await supabase.from('posts').select('*').order('published_at',{ascending:false,nullsFirst:false}); if(error) throw error; allPosts=data||[]; renderPosts(); updateStats(); }
function listenPosts() { fetchPosts().catch(() => { document.getElementById('postsListPanel').textContent='Error loading posts.'; }); supabase.channel('admin-posts').on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>fetchPosts()).subscribe(); }
function renderPosts() { const panel=document.getElementById('postsListPanel'), query=(document.getElementById('postSearch')?.value||'').toLowerCase(), posts=allPosts.filter(p=>[p.title,p.slug,p.author_name,...(p.tags||[])].join(' ').toLowerCase().includes(query)); panel.innerHTML=posts.length?posts.map(p=>`<article class="admin-post-card"><img class="apc-cover" src="${esc(p.cover_image)}" alt=""><div class="apc-info"><span class="post-status ${esc(p.status)}">${esc(p.status)}</span><h3>${esc(p.title)}</h3><p>/${esc(p.slug)} · ${esc(p.author_name)}</p></div><div class="apc-actions"><button class="action-btn action-edit post-edit" data-id="${p.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>${p.status==='published'?`<a class="action-btn action-view" target="_blank" href="/blog/${encodeURIComponent(p.slug)}" title="View live"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:''}<button class="action-btn action-delete post-delete" data-id="${p.id}" title="Delete"><i class="fa-solid fa-trash"></i></button></div></article>`).join(''):'<div class="table-empty">No posts yet.</div>'; panel.querySelectorAll('.post-edit').forEach(b=>b.onclick=()=>editPost(b.dataset.id)); panel.querySelectorAll('.post-delete').forEach(b=>b.onclick=()=>deletePost(b.dataset.id)); }
function setupPostModal() { document.getElementById('addPostBtn').onclick=()=>{resetPost();openModal('postModal')}; ['postModalClose','postModalCancel'].forEach(id=>document.getElementById(id).onclick=()=>closeModal('postModal')); document.getElementById('postTitle').oninput=e=>{if(!slugManual)document.getElementById('postSlug').value=slugify(e.target.value)}; document.getElementById('postSlug').oninput=()=>slugManual=true; document.getElementById('postSearch').oninput=renderPosts; document.getElementById('savePostBtn').onclick=()=>savePost().catch(error=>showToast(error.message||'Could not save the post.','error')); document.getElementById('postCoverFile').onchange=e=>stageCoverFile(e.target.files[0]); document.getElementById('removePostCover').onclick=()=>{currentCover='';document.getElementById('postCoverFile').value='';document.getElementById('postCoverPreview').hidden=true}; document.getElementById('postInlineFile').onchange=e=>{const file=e.target.files[0];e.target.value='';insertInlineImageFile(file);}; [['postExcerpt','postExcerptCount',320],['postMetaDescription','postMetaCount',160]].forEach(([input,count,max])=>document.getElementById(input).oninput=e=>document.getElementById(count).textContent=`${e.target.value.length}/${max}`); setupPostDragDrop(); setupPostKeyboardShortcuts(); initPostEditor(); }
function stageCoverFile(file){ if(!file)return; document.querySelector('#postCoverPreview img').src=URL.createObjectURL(file); document.getElementById('postCoverPreview').hidden=false; const dt=new DataTransfer(); dt.items.add(file); document.getElementById('postCoverFile').files=dt.files; }
function setupPostDragDrop(){
  const dropzone=document.getElementById('postCoverDropzone');
  ['dragover','dragleave','drop'].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();dropzone.classList.toggle('drag-over',evt==='dragover');}));
  dropzone.addEventListener('drop',e=>stageCoverFile(e.dataTransfer.files[0]));
  const editorWrap=document.querySelector('.post-editor');
  ['dragover','dragleave','drop'].forEach(evt=>editorWrap.addEventListener(evt,e=>{e.preventDefault();editorWrap.classList.toggle('drag-over',evt==='dragover');}));
  editorWrap.addEventListener('drop',e=>insertInlineImageFile(e.dataTransfer.files[0]));
}
function setupPostKeyboardShortcuts(){
  document.addEventListener('keydown',e=>{
    if(!document.getElementById('postModal').classList.contains('open'))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();document.getElementById('savePostBtn').click();}
    else if(e.key==='Escape'){document.getElementById('postModalCancel').click();}
  });
}
async function initPostEditor(){const {default:Quill}=await import('https://esm.sh/quill@2.0.3');postQuill=new Quill('#postEditor',{theme:'snow',modules:{toolbar:[[{header:[2,3,false]}],['bold','italic','underline'],['blockquote'],[{list:'ordered'},{list:'bullet'}],['link','image'],['clean']]},formats:['header','bold','italic','underline','blockquote','list','link','image']});postQuill.getModule('toolbar').addHandler('image',()=>document.getElementById('postInlineFile').click());postQuill.on('text-change',updateWordCount);updateWordCount();}
function updateWordCount(){const text=postQuill?.getText()||'';const words=(text.trim().match(/\S+/g)||[]).length;const minutes=Math.max(1,Math.round(words/200));document.getElementById('postWordCount').textContent=`${words} word${words===1?'':'s'} · ${minutes} min read`;}
async function insertInlineImageFile(file){if(!file)return;const save=document.getElementById('savePostBtn');save.disabled=true;try{const url=await uploadPostImage(file,postId);const range=postQuill.getSelection(true)||{index:postQuill.getLength()};postQuill.insertEmbed(range.index,'image',url,'user');postQuill.setSelection(range.index+1,0);}catch(error){showToast(error.message||'Could not upload image.','error');}finally{save.disabled=false;}}
function resetPost(){postId=crypto.randomUUID();slugManual=false;currentCover='';['postEditId','postTitle','postSlug','postExcerpt','postMetaDescription'].forEach(id=>document.getElementById(id).value='');document.getElementById('postAuthor').value='Loginn Gaming Cafe';document.getElementById('postStatus').value='draft';document.getElementById('postCoverFile').value='';document.getElementById('postCoverPreview').hidden=true;document.getElementById('postExcerptCount').textContent='0/320';document.getElementById('postMetaCount').textContent='0/160';document.getElementById('postTags').value='';if(postQuill)postQuill.setContents([]);updateWordCount();}
async function savePost(){const title=document.getElementById('postTitle').value.trim(),slug=document.getElementById('postSlug').value.trim(),body=sanitizePostHtml(postQuill?.root.innerHTML||''),editId=document.getElementById('postEditId').value,coverFile=document.getElementById('postCoverFile').files[0];if(!title||!slug.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)||!document.getElementById('postExcerpt').value.trim()||!document.getElementById('postMetaDescription').value.trim()||!body.trim()){showToast('Complete all required fields with a valid slug.','error');return}if(coverFile)currentCover=await uploadPostImage(coverFile,postId);const status=document.getElementById('postStatus').value;if(status==='published'&&!currentCover){showToast('A cover image is required to publish.','error');return}const row={title,slug,author_name:document.getElementById('postAuthor').value.trim(),excerpt:document.getElementById('postExcerpt').value.trim(),meta_description:document.getElementById('postMetaDescription').value.trim(),body_html:body,tags:document.getElementById('postTags').value.split(',').map(t=>t.trim()).filter(Boolean),status,cover_image:currentCover||null};const {error}=editId?await supabase.from('posts').update(row).eq('id',editId):await supabase.from('posts').insert({id:postId,...row});if(error){showToast(error.message,'error');return}closeModal('postModal');fetchPosts();}
async function editPost(id){const p=allPosts.find(x=>x.id===id);if(!p)return;postId=p.id;slugManual=true;currentCover=p.cover_image||'';document.getElementById('postEditId').value=p.id;document.getElementById('postTitle').value=p.title;document.getElementById('postSlug').value=p.slug;document.getElementById('postAuthor').value=p.author_name;document.getElementById('postExcerpt').value=p.excerpt;document.getElementById('postMetaDescription').value=p.meta_description;document.getElementById('postStatus').value=p.status;document.getElementById('postTags').value=(p.tags||[]).join(', ');postQuill.root.innerHTML=sanitizePostHtml(p.body_html);updateWordCount();if(currentCover){document.querySelector('#postCoverPreview img').src=currentCover;document.getElementById('postCoverPreview').hidden=false}openModal('postModal');}
async function deletePost(id){if(!confirm('Delete this post?'))return;const {error}=await supabase.from('posts').delete().eq('id',id);if(error)showToast(error.message,'error');else fetchPosts();}
