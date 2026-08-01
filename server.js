const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { runScraper, loadCache } = require('./scraper');
const { applyFilters } = require('./filters');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

let scraping = false;

function currentYear() {
  return String(new Date().getFullYear());
}

function apiBooks() {
  const cache = loadCache();
  const year = currentYear();

  const books = applyFilters(
    (cache.books || []).filter((b) => b.firstSeen && b.firstSeen.startsWith(year)),
    { log: false }
  ).sort((a, b) => a.title.localeCompare(b.title, 'tr'));

  return {
    year,
    label: `${year} yılı yeni çıkan kitaplar`,
    scrapedAt: cache.lastScrapedAt || null,
    bookCount: books.length,
    books,
  };
}

app.get('/api/books', (req, res) => {
  try {
    res.json(apiBooks());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/refresh', async (req, res) => {
  if (scraping) return res.status(409).json({ error: 'Scraper zaten çalışıyor' });
  scraping = true;
  try {
    const count = await runScraper();
    res.json({ ok: true, bookCount: count, ...apiBooks() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    scraping = false;
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true, scraping }));

cron.schedule('0 9 * * 1', async () => {
  console.log('[cron] haftalık scrape başlıyor');
  scraping = true;
  try {
    await runScraper();
    console.log('[cron] scrape tamamlandı');
  } catch (e) {
    console.error('[cron] scrape hatası:', e.message);
  } finally {
    scraping = false;
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu: http://localhost:${PORT}`);
  console.log(`API:   http://localhost:${PORT}/api/books`);
});
