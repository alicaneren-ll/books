const SOURCE_LABELS = {
  kitapyurdu: 'Kitapyurdu',
  idefix: 'idefix',
  can: 'Can',
  iletisim: 'İletişim',
  ithaki: 'İthaki',
  iskultur: 'İş Bankası Kültür',
  yky: 'Yapı Kredi',
  everest: 'Everest',
  kirmizikedi: 'Kırmızı Kedi',
  dogan: 'Doğan Kitap',
  ayrinti: 'Ayrıntı',
  jaguar: 'Jaguar',
  ketebe: 'Ketebe',
  metis: 'Metis',
};

const PALETTES = [
  ['#1f6e5c', '#0e3b30'],
  ['#7a4f9e', '#432b5c'],
  ['#b05a3a', '#5f2c18'],
  ['#2d6ca8', '#163c5f'],
  ['#a0842d', '#5c4a13'],
  ['#7a3f66', '#452139'],
  ['#3f7a52', '#1e4129'],
  ['#8c4a4a', '#4e2222'],
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function priceText(price) {
  if (typeof price !== 'number') return null;
  return price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function coverGradient(book) {
  const [c1, c2] = PALETTES[hash(book.title) % PALETTES.length];
  return `linear-gradient(160deg, ${c1}, ${c2})`;
}

function coverHtml(book) {
  if (book.cover) {
    return `<img src="${book.cover}" alt="${escapeHtml(book.title)}" loading="lazy" onerror="this.parentElement.classList.add('img-error'); this.remove()" />`;
  }
  return placeholderFor(book.title);
}

function placeholderFor(title) {
  const initial = (title && title.trim()[0]) || 'K';
  return `
    <div class="cover-placeholder" style="background:${coverGradient({ title })}">
      <span class="initial">${escapeHtml(initial.toLocaleUpperCase('tr'))}</span>
      <span class="ph-title">${escapeHtml(title)}</span>
    </div>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sourceBadges(book) {
  return (book.sources || [])
    .map((s) => `<span class="source-badge">${SOURCE_LABELS[s.name] || escapeHtml(s.name)}</span>`)
    .join('');
}

function pricesHtml(book) {
  const prices = (book.sources || [])
    .map((s) => ({ src: SOURCE_LABELS[s.name] || s.name, price: priceText(s.price) }))
    .filter((p) => p.price !== null);
  if (!prices.length) return '';
  return prices
    .map((p) => `<span class="price">${p.price} <span class="p-src">· ${p.src}</span></span>`)
    .join('');
}

function bookKey(book) {
  return `${book.title}\u0000${book.author || ''}`;
}

function renderCard(book) {
  return `
    <article class="card" data-id="${encodeURIComponent(bookKey(book))}" tabindex="0" role="button" aria-label="${escapeHtml(book.title)}">
      <div class="cover">
        ${coverHtml(book)}
        <div class="source-badges">${sourceBadges(book)}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(book.title)}</h3>
        ${book.author ? `<p class="card-author">${escapeHtml(book.author)}</p>` : ''}
        ${book.publisher ? `<p class="card-publisher">${escapeHtml(book.publisher)}</p>` : ''}
        ${book.category ? `<p class="card-category">${escapeHtml(book.category)}</p>` : ''}
        <div class="card-prices">${pricesHtml(book)}</div>
      </div>
    </article>`;
}

function modalContent(book) {
  const cover = book.cover
    ? `<img src="${book.cover}" alt="${escapeHtml(book.title)}" onerror="this.parentElement.classList.add('img-error'); this.remove()" />`
    : `<div class="modal-cover-placeholder" style="background:${coverGradient(book)}"><span class="initial">${escapeHtml((book.title.trim()[0] || 'K').toLocaleUpperCase('tr'))}</span></div>`;

  const sources = (book.sources || [])
    .map((s) => {
      const label = SOURCE_LABELS[s.name] || s.name;
      const p = priceText(s.price);
      return `<a class="source-link" href="${s.url || '#'}" target="_blank" rel="noopener noreferrer">
        <span>${escapeHtml(label)}</span>
        ${p ? `<span class="price">${p}</span>` : ''}
        <span class="go">aç →</span>
      </a>`;
    })
    .join('');

  const meta = [];
  if (book.publishedDate) meta.push(`<div><b>Çıkış:</b> ${escapeHtml(book.publishedDate)}</div>`);
  if (book.isbn) meta.push(`<div><b>ISBN:</b> ${escapeHtml(book.isbn)}</div>`);
  if (book.language) meta.push(`<div><b>Dil:</b> ${escapeHtml(book.language)}</div>`);
  if (book.firstSeen) meta.push(`<div><b>Listeye girdi:</b> ${escapeHtml(book.firstSeen)}</div>`);

  return `
    <div class="modal-grid">
      <div class="modal-cover">${cover}</div>
      <div class="modal-info">
        <h2>${escapeHtml(book.title)}</h2>
        ${book.author ? `<p class="modal-author">${escapeHtml(book.author)}</p>` : ''}
        ${book.publisher ? `<p class="modal-author" style="margin-top:-10px">${escapeHtml(book.publisher)}</p>` : ''}
        <div class="meta">${meta.join('')}</div>
        ${book.description
          ? `<p class="desc">${escapeHtml(book.description).slice(0, 700)}${book.description.length > 700 ? '…' : ''}</p>`
          : '<p class="desc no-description">Özet bulunamadı.</p>'}
        <div class="source-list">${sources}</div>
        ${googlePreviewHtml(book)}
      </div>
    </div>`;
}

function googlePreviewHtml(book) {
  const isbn = book.isbn || '';
  if (!isbn && !book.previewLink) return '';
  return `
    <div class="gb-preview">
      ${isbn ? `<button type="button" class="gb-preview-btn" id="gb-preview-btn" data-isbn="${escapeHtml(isbn)}">Google Kitaplar önizlemesini aç</button>` : ''}
      ${book.previewLink ? `<a class="gb-link" href="${book.previewLink}" target="_blank" rel="noopener noreferrer">Google Kitaplar sayfasını aç →</a>` : ''}
      <div class="gb-viewer" id="viewerCanvas" hidden></div>
      <p class="gb-notfound" id="gb-notfound" hidden>Bu kitabın gömülebilir önizlemesi yok.</p>
    </div>`;
}

function startGoogleViewer(isbn) {
  const canvas = document.getElementById('viewerCanvas');
  const notFound = document.getElementById('gb-notfound');
  if (!canvas || !window.google?.books) return;
  canvas.hidden = false;
  const viewer = new google.books.DefaultViewer(canvas);
  viewer.load(
    `ISBN:${isbn}`,
    () => {
      canvas.hidden = true;
      notFound.hidden = false;
    },
    () => {}
  );
}

function ensureGoogleBooksScript(cb) {
  if (window.google?.books) return cb();
  const s = document.createElement('script');
  s.src = 'https://www.google.com/books/jsapi.js';
  s.onload = () => {
    google.books.load();
    google.books.setOnLoadCallback(cb);
  };
  s.onerror = () => {
    const btn = document.getElementById('gb-preview-btn');
    const notFound = document.getElementById('gb-notfound');
    if (btn) btn.style.display = 'none';
    if (notFound) {
      notFound.hidden = false;
      notFound.textContent = 'Google Kitaplar önizlemesi yüklenemedi.';
    }
  };
  document.head.appendChild(s);
}

let books = [];
const activeCategories = new Set();
const activePublishers = new Set();

function uniqueValues(get) {
  return [...new Set(books.map(get).filter((v) => v && v.trim()))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );
}

function chipHtml(list, isActive, name) {
  const all = `<button class="chip ${isActive(null) ? 'active' : ''}" data-filter="${name}" data-value="">Tümü</button>`;
  const items = list
    .map((v) => `<button class="chip ${isActive(v) ? 'active' : ''}" data-filter="${name}" data-value="${escapeHtml(v)}">${escapeHtml(v)}</button>`)
    .join('');
  return all + items;
}

function buildChips() {
  const categories = uniqueValues((b) => b.category);
  const publishers = uniqueValues((b) => b.publisher);
  const filtersEl = document.getElementById('filters');
  filtersEl.hidden = categories.length === 0 && publishers.length === 0;
  document.getElementById('category-chips').innerHTML = chipHtml(
    categories,
    (v) => (v === null ? activeCategories.size === 0 : activeCategories.has(v)),
    'category'
  );
  document.getElementById('publisher-chips').innerHTML = chipHtml(
    publishers,
    (v) => (v === null ? activePublishers.size === 0 : activePublishers.has(v)),
    'publisher'
  );
}

async function loadBooks() {
  try {
    let data;
    if (window.__STATIC_BOOKS__) {
      data = window.__STATIC_BOOKS__;
    } else {
      const res = await fetch('/api/books');
      data = await res.json();
    }
    books = data.books || [];
    buildChips();
    const label = data.label;
    document.getElementById('year-label').textContent = label
      ? label
      : 'Derleme yüklenemedi';
    document.getElementById('book-count').textContent = `${books.length} kitap`;
    document.getElementById('scrape-info').textContent = data.scrapedAt
      ? `Son güncelleme: ${new Date(data.scrapedAt).toLocaleString('tr-TR')}`
      : 'Henüz derleme yapılmadı';
    render();
  } catch (e) {
    console.error(e);
    document.getElementById('year-label').textContent = 'Veri yüklenemedi. Sunucunun çalıştığından emin olun.';
  }
}

function render() {
  const q = document.getElementById('search').value.trim().toLocaleLowerCase('tr');
  const filtered = books.filter((b) => {
    if (q && !`${b.title} ${b.author || ''} ${b.publisher || ''}`.toLocaleLowerCase('tr').includes(q)) {
      return false;
    }
    if (activeCategories.size > 0 && !activeCategories.has(b.category)) return false;
    if (activePublishers.size > 0 && !activePublishers.has(b.publisher)) return false;
    return true;
  });

  const grid = document.getElementById('book-grid');
  grid.innerHTML = filtered.map(renderCard).join('');

  const empty = document.getElementById('empty-state');
  empty.hidden = filtered.length > 0;
  if (filtered.length === 0 && books.length > 0) {
    const q = document.getElementById('search').value.trim();
    const hasFilter = activeCategories.size > 0 || activePublishers.size > 0;
    empty.textContent = hasFilter
      ? 'Seçilen filtrelerle eşleşen kitap bulunamadı.'
      : `"${q}" için sonuç bulunamadı.`;
    empty.hidden = false;
  }
  document.getElementById('book-count').textContent = `${filtered.length} kitap`;
}

function openModal(book) {
  document.getElementById('modal-body').innerHTML = modalContent(book);
  document.getElementById('modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
});

document.getElementById('search').addEventListener('input', render);

document.getElementById('category-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const v = chip.dataset.value;
  if (v === '') {
    activeCategories.clear();
  } else if (activeCategories.has(v)) {
    activeCategories.delete(v);
  } else {
    activeCategories.add(v);
  }
  buildChips();
  render();
});
document.getElementById('publisher-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const v = chip.dataset.value;
  if (v === '') {
    activePublishers.clear();
  } else if (activePublishers.has(v)) {
    activePublishers.delete(v);
  } else {
    activePublishers.add(v);
  }
  buildChips();
  render();
});

document.getElementById('book-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const key = decodeURIComponent(card.dataset.id);
  const book = books.find((b) => bookKey(b) === key);
  if (book) openModal(book);
});

document.getElementById('book-grid').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const card = e.target.closest('.card');
    if (card) card.click();
  }
});

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal')) closeModal();
});
document.getElementById('modal-body').addEventListener('click', (e) => {
  if (e.target.id === 'gb-preview-btn') {
    ensureGoogleBooksScript(() => startGoogleViewer(e.target.dataset.isbn));
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

const STATIC_MODE = Boolean(window.__STATIC_BOOKS__);

if (STATIC_MODE) {
  const rb = document.getElementById('refresh-btn');
  if (rb) rb.style.display = 'none';
}

document.getElementById('refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = 'Yenileniyor…';
  try {
    await fetch('/api/refresh', { method: 'POST' });
    await loadBooks();
  } finally {
    btn.disabled = false;
    btn.textContent = 'derlemeyi yenile';
  }
});

loadBooks();
