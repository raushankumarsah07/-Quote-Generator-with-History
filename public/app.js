const $ = (id) => document.getElementById(id);
const quoteEl = $('quote'), authorEl = $('author'), noteEl = $('note'), msgEl = $('msg');
const newBtn = $('newBtn'), favBtn = $('favBtn'), copyBtn = $('copyBtn');
const listEl = $('list'), emptyEl = $('empty'), countEl = $('count'), searchEl = $('search');
let current = null, msgTimer;

function showMsg(text, isError = false) {
  msgEl.textContent = text;
  msgEl.className = 'msg' + (isError ? ' error' : '');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => (msgEl.textContent = ''), 3000);
}

async function copyText(text, author) {
  const full = `"${text}" - ${author}`;
  try {
    await navigator.clipboard.writeText(full);
    showMsg('Copied to clipboard.');
  } catch {
    const ta = document.createElement('textarea'); // fallback for older browsers
    ta.value = full;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    showMsg(ok ? 'Copied to clipboard.' : 'Copy failed. Select the text and copy it manually.', !ok);
  }
}

async function loadQuote() {
  newBtn.disabled = true;
  quoteEl.textContent = 'Loading a quote...';
  authorEl.textContent = '';
  try {
    const res = await fetch('/api/quote');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    current = data;
    quoteEl.textContent = `"${data.text}"`;
    authorEl.textContent = data.author;
    noteEl.hidden = data.source !== 'fallback';
  } catch (e) {
    current = null;
    quoteEl.textContent = 'Could not load a quote.';
    showMsg(e.message || 'Check your connection and try again.', true);
  } finally {
    newBtn.disabled = false;
  }
}

async function saveFavorite() {
  if (!current) return showMsg('Load a quote first.', true);
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: current.text, author: current.author }),
  });
  const data = await res.json();
  showMsg(res.ok ? 'Saved to favorites.' : data.error, !res.ok);
  if (res.ok) loadFavorites();
}

async function loadFavorites() {
  try {
    const res = await fetch('/api/favorites?search=' + encodeURIComponent(searchEl.value.trim()));
    const favs = await res.json();
    if (!res.ok) throw new Error(favs.error);
    listEl.innerHTML = '';
    favs.forEach((f) => {
      const li = document.createElement('li');
      li.dataset.id = f._id;
      li.dataset.text = f.text;
      li.dataset.author = f.author;
      const t = document.createElement('p'); t.className = 't'; t.textContent = `"${f.text}"`; // textContent = XSS-safe
      const a = document.createElement('p'); a.className = 'a'; a.textContent = f.author;
      const copy = document.createElement('button'); copy.textContent = 'Copy'; copy.dataset.act = 'copy';
      const del = document.createElement('button'); del.textContent = 'Remove'; del.className = 'del'; del.dataset.act = 'del';
      li.append(t, a, copy, del);
      listEl.appendChild(li);
    });
    countEl.textContent = favs.length ? `(${favs.length})` : '';
    emptyEl.hidden = favs.length > 0;
    emptyEl.textContent = searchEl.value.trim()
      ? 'No favorites match your search.'
      : 'No favorites yet. Save a quote you like and it will show up here.';
  } catch (e) {
    showMsg(e.message || 'Could not load favorites.', true);
  }
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const li = btn.closest('li');
  if (btn.dataset.act === 'copy') return copyText(li.dataset.text, li.dataset.author);
  if (btn.dataset.act === 'del') {
    const res = await fetch('/api/favorites/' + li.dataset.id, { method: 'DELETE' });
    showMsg(res.ok ? 'Removed from favorites.' : 'Could not remove.', !res.ok);
    if (res.ok) loadFavorites();
  }
});

let searchTimer;
searchEl.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadFavorites, 250); });
newBtn.addEventListener('click', loadQuote);
favBtn.addEventListener('click', saveFavorite);
copyBtn.addEventListener('click', () => current && copyText(current.text, current.author));

loadQuote();
loadFavorites();
