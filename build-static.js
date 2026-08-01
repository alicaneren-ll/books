const fs = require('fs');
const path = require('path');
const { applyFilters } = require('./filters');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'weekly.json');
const INDEX_FILE = path.join(ROOT, 'public', 'index.html');
const CSS_FILE = path.join(ROOT, 'public', 'styles.css');
const APPJS_FILE = path.join(ROOT, 'public', 'app.js');
const OUT_FILE = path.join(ROOT, 'index.html');

function currentYear() {
  return String(new Date().getFullYear());
}

const cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const year = currentYear();

const books = applyFilters(
  (cache.books || []).filter((b) => b.firstSeen && b.firstSeen.startsWith(year)),
  { log: false }
).sort((a, b) => a.title.localeCompare(b.title, 'tr'));

const staticData = {
  year,
  label: `${year} yılı yeni çıkan kitaplar`,
  scrapedAt: cache.lastScrapedAt || null,
  bookCount: books.length,
  books,
};

let html = fs.readFileSync(INDEX_FILE, 'utf8');
const css = fs.readFileSync(CSS_FILE, 'utf8');
const appjs = fs.readFileSync(APPJS_FILE, 'utf8');

html = html.replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`);
html = html.replace(
  '<script src="app.js"></script>',
  `<script>window.__STATIC_BOOKS__ = ${JSON.stringify(staticData)};</script>\n  <script>${appjs}</script>`
);

fs.writeFileSync(OUT_FILE, html, 'utf8');
console.log(`Oluşturuldu: ${OUT_FILE}`);
console.log(`  Yıl: ${staticData.year}`);
console.log(`  Kitap sayısı: ${staticData.bookCount}`);
console.log(`  Boyut: ${Math.round(html.length / 1024)} KB`);
