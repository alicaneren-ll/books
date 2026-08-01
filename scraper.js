const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { applyFilters } = require('./filters');

const DATA_FILE = path.join(__dirname, 'data', 'weekly.json');
const UA = 'WeeklyNewBooksBot/1.0 (non-commercial weekly compilation; polite low-frequency requests)';
const DELAY_MS = 1500;
const MAX_ENRICH = 20;
const MAX_PUB_SOURCE = 15;
const CAN_URL = 'https://www.canyayinlari.com/yeni-cikanlar';
const ILETISIM_RSS_URL = 'https://www.iletisim.com.tr/rss/yeni-cikanlar';
const ITHAKI_URL = 'https://www.ithakiyayingrubu.com/yeni-cikanlar?pagenumber=1&pagesize=24';
const ISKULTUR_URL = 'https://www.iskultur.com.tr/yeni-cikanlar';
const YKY_URL = 'https://www.yapikrediyayinlari.com.tr/kitap/yeni-cikanlar';
const EVEREST_URL = 'https://everestyayinlari.com/ana-sayfa/yeni-cikanlar';
const KIRMIZIKEDI_URL = 'https://www.kirmizikedi.com/yenicikanlar';
const DOGAN_URL = 'https://www.dogankitap.com.tr/kitaplarimiz/yeni-cikanlar';
const AYRINTI_URL_TEMPLATE = 'https://www.ayrintiyayingrubu.com/yayim-tarihi/{ay}-{yil}/';
const JAGUAR_URL = 'https://jaguarkitap.com/kitaplar/yeni/';
const KETEBE_URL = 'https://www.ketebe.com/yeni-kitaplar';
const METIS_URL = 'https://www.metiskitap.com/catalog/newreleases';
const AY_NAMES = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
const OPEN_LIBRARY_URL = 'https://openlibrary.org/search.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalize(s) {
  return (s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr');
}

function stableKey(book) {
  return `${normalize(book.title)}|${normalize(book.author)}`;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function toDateStr(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parsePrice(text) {
  const m = String(text).replace(/\s+/g, ' ').match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
}

// İş Bankası formatı: "89,60 TL" / "89.60 TL" / "49000 TL" (nokta ondalık ayracı)
function parseIskulturPrice(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const m = clean.match(/(\d+)[.,](\d{1,2})\s*TL/);
  if (m) return parseFloat(`${m[1]}.${m[2]}`);
  const n = clean.match(/(\d+)/);
  return n ? parseFloat(n[1]) : null;
}

function cleanWhitespace(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function cleanPublisher(raw) {
  const p = cleanWhitespace(raw);
  if (!p) return null;
  return p.replace(/\s*[-–—]\s*KAMPANYA\s*$/i, '').trim() || null;
}

const PUBLISHER_SUFFIXES = ['yayınevi', 'yayıncılık', 'yayınları', 'yayın', 'kitapları', 'kitap'];

function cleanIdefixTitle(name) {
  const t = cleanWhitespace(name);
  const parts = t.split(' - ');
  if (parts.length > 1) {
    const last = parts[parts.length - 1].toLocaleLowerCase('tr');
    if (PUBLISHER_SUFFIXES.some((sfx) => last.endsWith(sfx))) {
      return parts.slice(0, -1).join(' - ');
    }
  }
  return t;
}

// ---------- Kitapyurdu ----------
function parseKitapyurduHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('.ky-product').each((i, el) => {
    const $el = $(el);
    const $titleLink = $el.find('.ky-product-title').first().closest('a');
    const href = $titleLink.attr('href') || $el.find('.ky-product-cover').attr('href') || '';
    const title = cleanWhitespace($titleLink.text()) || cleanWhitespace($el.find('.ky-product-title').first().text());
    const author = cleanWhitespace($el.find('.ky-product-author a').first().text()) || null;
    const publisher = cleanPublisher($el.find('.ky-product-publisher a').first().text());
    const price = parsePrice($el.find('.ky-product-price.ky-product-sell-price').first().text());

    if (!title) return;
    books.push({
      source: 'kitapyurdu',
      title,
      author,
      publisher,
      category: null,
      price,
      url: href ? new URL(href, 'https://www.kitapyurdu.com').toString() : null,
    });
  });
  return books;
}

async function scrapeKitapyurdu() {
  const url = 'https://www.kitapyurdu.com/index.php?list_id=630&route=product%2Fbest_sellers';
  const html = await fetchText(url);
  return parseKitapyurduHtml(html);
}

// ---------- Idefix ----------
function parseIdefixHtml(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('idefix __NEXT_DATA__ bulunamadı');
  const data = JSON.parse(m[1]);
  const items = data?.props?.pageProps?.categoryData?.items || [];
  const books = [];

  for (const item of items) {
    if (item.isBook !== true) continue;
    const v = item.variants?.[0];
    if (!v || !v.name) continue;
    const title = cleanIdefixTitle(v.name);
    const author = cleanWhitespace(v.authorName) || null;
    const price = typeof v.price === 'number' ? v.price : parsePrice(v.price);
    const tree = Array.isArray(item.categoryTree) ? item.categoryTree : [];
    const category = tree.length ? cleanWhitespace(tree[tree.length - 1].name) : null;
    books.push({
      source: 'idefix',
      title,
      author,
      publisher: null,
      category,
      price,
      url: v.handleUrl ? new URL(v.handleUrl, 'https://www.idefix.com').toString() : null,
    });
  }
  return books;
}

async function scrapeIdefix() {
  const url = 'https://www.idefix.com/kitap-c-3307?sort=desc_added';
  const html = await fetchText(url);
  return parseIdefixHtml(html);
}

// ---------- Can Yayınları ----------
function parseCanCategory(cat) {
  const parts = String(cat || '')
    .split('/')
    .map((s) => cleanWhitespace(s))
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

function parseCanHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('div.item.itemauto').each((i, el) => {
    const $el = $(el);
    const title = cleanWhitespace($el.attr('data-dlname')) || cleanWhitespace($el.find('.product-name a').first().text());
    const author = cleanWhitespace($el.find('p.product-brnd').first().text()) || null;
    const publisher = $el.attr('data-dlbrand') || 'Can Yayınları';
    const isbnRaw = $el.attr('data-dlid') || '';
    const isbn = /^\d{10,13}$/.test(isbnRaw) ? isbnRaw : null;
    const urlPath = $el.attr('data-dlurl') || $el.find('.product-name a').first().attr('href') || '';
    const price = parsePrice($el.find('.price .price-sales').first().text()) || parsePrice($el.attr('data-dlprice'));

    if (!title) return;
    books.push({
      source: 'can',
      title,
      author,
      publisher,
      category: parseCanCategory($el.attr('data-dlcategory')),
      price,
      isbn,
      url: urlPath ? new URL(urlPath, 'https://www.canyayinlari.com').toString() : null,
    });
  });
  return books;
}

async function scrapeCan() {
  const html = await fetchText(CAN_URL);
  return parseCanHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- İletişim Yayınları (resmî RSS) ----------
function decodeXmlEntities(s) {
  return String(s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseIletisimRss(xml) {
  const books = [];
  const blocks = String(xml).split(/<item>/i).slice(1);

  for (const block of blocks) {
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };
    const rawTitle = decodeXmlEntities(get('title')).replace(/<[^>]+>/g, '').trim();
    const parts = rawTitle.split(' - ');
    const title = parts.length > 1 ? parts.slice(0, -1).join(' - ') : rawTitle;
    const author = parts.length > 1 ? cleanWhitespace(parts[parts.length - 1]) : null;
    const isbn = get('g:id') || get('g:gtin');
    const pubDate = parseRssDate(get('pubDate'));

    if (!title) continue;
    books.push({
      source: 'iletisim',
      title,
      author,
      publisher: 'İletişim Yayınları',
      category: null,
      price: null,
      isbn: /^\d{10,13}$/.test(isbn) ? isbn : null,
      publishedDate: pubDate,
      url: get('link') || get('guid') || null,
    });
  }
  return books;
}

function parseRssDate(s) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : toDateStr(d);
}

async function scrapeIletisim() {
  const xml = await fetchText(ILETISIM_RSS_URL);
  return parseIletisimRss(xml).slice(0, MAX_PUB_SOURCE);
}

// ---------- İthaki Yayınları ----------
function parseDDMMYYYY(s) {
  const m = String(s || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return toDateStr(d);
}

function parseIthakiHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('.products-list__item').each((i, el) => {
    const $el = $(el);
    const title = cleanWhitespace($el.find('.product-card__name a.product-info-detail').first().text());
    const author = cleanWhitespace($el.find('.product-box_specification-attribute-value').first().text()) || null;
    const href = $el.find('a.product-info-detail').first().attr('href') || '';
    const price = parsePrice($el.find('.custom-sale_price').first().text()) || parsePrice($el.find('.product-card__old-price').first().text());
    const script = $el.find('script').first().text() || '';
    const catMatch = script.match(/"item_category":"([^"]*)"/);
    const category = catMatch ? cleanWhitespace(catMatch[1]) : null;
    const date = cleanWhitespace($el.find('.product-card__description').first().text());

    if (!title) return;
    books.push({
      source: 'ithaki',
      title,
      author,
      publisher: null,
      category,
      price,
      publishedDate: parseDDMMYYYY(date),
      url: href ? new URL(href, 'https://www.ithakiyayingrubu.com').toString() : null,
    });
  });
  return books;
}

async function scrapeIthaki() {
  const html = await fetchText(ITHAKI_URL);
  return parseIthakiHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- İş Bankası Kültür Yayınları ----------
function parseIskulturHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('a.product').each((i, el) => {
    const $el = $(el);
    const title = cleanWhitespace($el.find('h3').first().text());
    const author = cleanWhitespace($el.find('p.yazar').first().text()) || null;
    const price = parseIskulturPrice($el.find('p.fiyat').first().text());
    const cover = $el.find('.img img').first().attr('src') || null;
    const href = $el.attr('href') || '';

    if (!title) return;
    books.push({
      source: 'iskultur',
      title,
      author,
      publisher: 'İş Bankası Kültür Yayınları',
      category: null,
      price,
      cover,
      url: href ? new URL(href, 'https://www.iskultur.com.tr').toString() : null,
    });
  });
  return books;
}

async function scrapeIskultur() {
  const html = await fetchText(ISKULTUR_URL);
  return parseIskulturHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- Yapı Kredi Yayınları ----------
function parseYkyHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('.urunList').each((i, el) => {
    const $el = $(el);
    const title = cleanWhitespace($el.find('h3').first().text());
    const author = cleanWhitespace($el.find('p.author').first().text()) || null;
    const price = parsePrice($el.find('.price').first().text());
    const cover = $el.find('figure img').first().attr('src') || null;
    const href = $el.find('a').first().attr('href') || '';

    if (!title) return;
    books.push({
      source: 'yky',
      title,
      author,
      publisher: 'Yapı Kredi Yayınları',
      category: null,
      price,
      cover,
      url: href ? new URL(href, 'https://www.yapikrediyayinlari.com.tr').toString() : null,
    });
  });
  return books;
}

async function scrapeYky() {
  const html = await fetchText(YKY_URL);
  return parseYkyHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- Everest Yayınları ----------
function parseEverestHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('li.item.product.product-item').each((i, el) => {
    const $el = $(el);
    const $link = $el.find('.product-item-link').first();
    const title = cleanWhitespace($link.text());
    const price =
      parseFloat($el.find('.special-price [data-price-amount]').first().attr('data-price-amount')) ||
      parseFloat($el.find('.price-final_price [data-price-amount]').first().attr('data-price-amount')) ||
      parsePrice($el.find('.price-final_price').first().text());
    const img = $el.find('img.product-image-photo').first();
    const cover = img.attr('data-src') || img.attr('src') || null;
    const href = $link.attr('href') || '';

    if (!title) return;
    books.push({
      source: 'everest',
      title,
      author: null,
      publisher: 'Everest Yayınları',
      category: null,
      price,
      cover,
      url: href ? new URL(href, 'https://everestyayinlari.com').toString() : null,
    });
  });
  return books;
}

async function scrapeEverest() {
  const html = await fetchText(EVEREST_URL);
  return parseEverestHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- Kırmızı Kedi Yayınları ----------
function parseKirmizikediHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('div.product-box').each((i, el) => {
    const $el = $(el);
    const title = cleanWhitespace($el.find('.product-name-label').first().text());
    const publisher = cleanWhitespace($el.find('.brand-name').first().text()) || 'Kırmızı Kedi Yayınları';
    const price =
      parsePrice($el.find('.price-box .cmp-price').first().text()) ||
      parsePrice($el.find('.price-box .price').first().text());
    const cover = $el.find('.product-img .image-box img').first().attr('src') || null;
    const href = $el.find('a[title]').first().attr('href') || '';

    if (!title) return;
    books.push({
      source: 'kirmizikedi',
      title,
      author: null,
      publisher,
      category: null,
      price,
      cover,
      url: href ? new URL(href, 'https://www.kirmizikedi.com').toString() : null,
    });
  });
  return books;
}

async function scrapeKirmizikedi() {
  const html = await fetchText(KIRMIZIKEDI_URL);
  return parseKirmizikediHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- Doğan Kitap ----------
function parseDoganHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('#kitaplistesi div.kitap').each((i, el) => {
    const $el = $(el);
    const $baslik = $el.find('.k-baslik p').first();
    const title = cleanWhitespace($baslik.clone().children('span').remove().end().text());
    const author = cleanWhitespace($el.find('.k-yazar').first().text()) || null;
    const category = cleanWhitespace($el.find('.k-kategori').first().text()) || null;
    const publisher = cleanWhitespace($el.find('.k-firma').first().text()) || null;
    const cover = $el.find('a.kitapkare img').first().attr('src') || null;
    const href = $el.find('a.kitapkare').first().attr('href') || '';

    if (!title) return;
    books.push({
      source: 'dogan',
      title,
      author,
      publisher,
      category,
      price: null,
      cover,
      url: href ? new URL(href, 'https://www.dogankitap.com.tr').toString() : null,
    });
  });
  return books;
}

async function scrapeDogan() {
  const html = await fetchText(DOGAN_URL);
  return parseDoganHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- Ayrıntı Yayınları (ay arşivi) ----------
function parseAyrintiHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('ul.products li.product').each((i, el) => {
    const $el = $(el);
    const title = cleanWhitespace($el.find('.cmsmasters_product_title a').first().text());
    const category = cleanWhitespace($el.find('.cmsmasters_product_cat a').first().text()) || null;
    const price =
      parsePrice($el.find('.price ins .woocommerce-Price-amount').first().text()) ||
      parsePrice($el.find('.price').first().text());
    const cover = $el.find('.cmsmasters_product_img img').first().attr('src') || null;
    const href = $el.find('.cmsmasters_product_img a').first().attr('href') || '';

    if (!title) return;
    books.push({
      source: 'ayrinti',
      title,
      author: null,
      publisher: 'Ayrıntı Yayınları',
      category,
      price,
      cover,
      url: href ? new URL(href, 'https://www.ayrintiyayingrubu.com').toString() : null,
    });
  });
  return books;
}

async function scrapeAyrinti() {
  const now = new Date();
  for (let back = 0; back < 2; back++) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const url = AYRINTI_URL_TEMPLATE.replace('{ay}', AY_NAMES[d.getMonth()]).replace('{yil}', d.getFullYear());
    try {
      const html = await fetchText(url);
      return parseAyrintiHtml(html).slice(0, MAX_PUB_SOURCE);
    } catch (e) {
      if (back === 1) throw e;
    }
  }
  return [];
}

// ---------- Jaguar Kitap ----------
function parseJaguarHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('article.tease-product').each((i, el) => {
    const $el = $(el);
    const title =
      cleanWhitespace($el.find('meta[itemprop="name"]').first().attr('content')) ||
      cleanWhitespace($el.find('h2.card-title a').first().text());
    const author = cleanWhitespace($el.find('h2.card-title small').first().text()) || null;
    const cover = $el.find('meta[itemprop="image"]').first().attr('content') || null;
    const href = $el.find('a.btn-loading-page').first().attr('href') || $el.find('h2.card-title a').first().attr('href') || '';

    if (!title) return;
    books.push({
      source: 'jaguar',
      title,
      author,
      publisher: 'Jaguar Kitap',
      category: null,
      price: null,
      cover,
      url: href ? new URL(href, 'https://jaguarkitap.com').toString() : null,
    });
  });
  return books;
}

async function scrapeJaguar() {
  const html = await fetchText(JAGUAR_URL);
  return parseJaguarHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- Ketebe Yayınları ----------
function decodeUnicodeEscapes(s) {
  return String(s || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function ketebeCategoryMap($) {
  const map = new Map();
  $('script').each((i, el) => {
    const t = $(el).html() || '';
    const m = t.match(/JSON\.parse\('([\s\S]*?)'\)/);
    if (!m) return;
    try {
      const data = JSON.parse(m[1].replace(/\\"/g, '"'));
      if (data && data.url && data.category) map.set(data.url, decodeUnicodeEscapes(cleanWhitespace(data.category)));
    } catch {}
  });
  return map;
}

function parseKetebeHtml(html) {
  const $ = cheerio.load(html);
  const books = [];
  const catMap = ketebeCategoryMap($);

  $('div.productItem').each((i, el) => {
    const $el = $(el);
    const title = cleanWhitespace($el.find('a.vitrin-urunadi').first().text());
    const author = cleanWhitespace($el.find('a.vitrin-model').first().text()) || null;
    const price =
      parseFloat($el.find('span[itemprop="price"]').first().attr('content')) ||
      parsePrice($el.find('.currentPrice').first().text());
    const cover = $el.find('span[itemprop="image"]').first().attr('content') || $el.find('img.active').first().attr('src') || null;
    const href = $el.find('a.detailLink').first().attr('href') || '';
    const urlKey = cleanWhitespace($el.find('span[itemprop="url"]').first().attr('content')) || '';
    const category = urlKey ? catMap.get(urlKey) || null : null;

    if (!title) return;
    books.push({
      source: 'ketebe',
      title,
      author,
      publisher: 'Ketebe Yayınları',
      category,
      price,
      cover,
      url: href ? new URL(href, 'https://www.ketebe.com').toString() : null,
    });
  });
  return books;
}

async function scrapeKetebe() {
  const html = await fetchText(KETEBE_URL);
  return parseKetebeHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- Metis Yayınları ----------
function parseMetisHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  $('#NewBooksPanel tr:has(td.ItemDescription)').each((i, el) => {
    const $el = $(el);
    const title = cleanWhitespace($el.find('td.ItemDescription a.MTitle.MClearPadding').first().text());
    const author = cleanWhitespace($el.find('td.ItemDescription a.MSubTitle.Author').first().text()) || null;
    const cover = $el.find('td.ItemImage img').first().attr('src') || null;
    const href = $el.find('td.ItemDescription a.MTitle.MClearPadding').first().attr('href') || '';

    if (!title) return;
    books.push({
      source: 'metis',
      title,
      author,
      publisher: 'Metis Yayınları',
      category: null,
      price: null,
      cover,
      url: href ? new URL(href, 'https://www.metiskitap.com').toString() : null,
    });
  });
  return books;
}

async function scrapeMetis() {
  const html = await fetchText(METIS_URL);
  return parseMetisHtml(html).slice(0, MAX_PUB_SOURCE);
}

// ---------- Google Books / Open Library enrichment ----------
function pickIsbn(identifiers) {
  if (!Array.isArray(identifiers)) return null;
  const isbn13 = identifiers.find((i) => i.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;
  const isbn10 = identifiers.find((i) => i.type === 'ISBN_10');
  return isbn10 ? isbn10.identifier : null;
}

async function googleEnrich(book) {
  const candidates = [book.title];
  const clean = book.title.split(' - ').slice(0, -1).join(' - ').trim();
  if (clean && clean !== book.title) candidates.push(clean);

  for (const title of candidates) {
    const q = `intitle:"${title}"${book.author ? ` inauthor:"${book.author}"` : ''}`;
    const key = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
    const url = `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(q)}&maxResults=1&country=TR&langRestrict=tr&fields=items(id,volumeInfo(title,authors,publisher,categories,publishedDate,description,pageCount,averageRating,ratingsCount,industryIdentifiers,imageLinks,language,infoLink),accessInfo(embeddable,previewLink))${key}`;
    const text = await fetchText(url);
    const data = JSON.parse(text);
    const item = data?.items?.[0];
    if (!item) continue;

    const vi = item.volumeInfo || {};
    const links = vi.imageLinks || {};
    const thumbnail = links.extraLarge || links.large || links.medium || links.thumbnail || null;

    return {
      isbn: pickIsbn(vi.industryIdentifiers),
      cover: thumbnail,
      description: vi.description || null,
      publishedDate: vi.publishedDate || null,
      language: vi.language || null,
      publisher: vi.publisher || null,
      categories: Array.isArray(vi.categories) && vi.categories.length ? vi.categories : null,
      previewLink: item.accessInfo?.previewLink || null,
      embeddable: Boolean(item.accessInfo?.embeddable),
      infoLink: vi.infoLink || null,
    };
  }
  return null;
}

async function openLibraryEnrich(book) {
  const params = new URLSearchParams({ title: book.title, fields: 'title,author_name,first_publish_year,isbn,cover_i', limit: '1' });
  if (book.author) params.set('author', book.author);
  const text = await fetchText(`${OPEN_LIBRARY_URL}?${params.toString()}`);
  const data = JSON.parse(text);
  const doc = data?.docs?.[0];
  if (!doc) return null;

  const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : null;
  let cover = null;
  if (typeof doc.cover_i === 'number') {
    cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  } else if (isbn) {
    cover = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  }
  return {
    isbn,
    cover,
    description: null,
    publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null,
    language: null,
  };
}

let googleDown = false;

async function enrichBook(book) {
  let extra = null;
  if (!googleDown) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        extra = await googleEnrich(book);
        break;
      } catch (e) {
        if (e.message.startsWith('429')) {
          if (attempt < 2) {
            await sleep(DELAY_MS * attempt);
            continue;
          }
          googleDown = true;
          console.warn('[scraper] Google Books limiti aşıldı, Open Library\'ye geçiliyor');
        } else {
          console.warn(`[scraper] google zenginleştirme hatası: ${e.message}`);
        }
        break;
      }
    }
  }
  if (extra) await sleep(DELAY_MS);

  if (!extra) {
    try {
      extra = await openLibraryEnrich(book);
      if (extra) await sleep(DELAY_MS);
    } catch (e) {
      console.warn(`[scraper] openlibrary zenginleştirme hatası: ${e.message}`);
    }
  }

  if (extra) {
    book.isbn = book.isbn || extra.isbn;
    if (extra.cover) book.cover = extra.cover;
    if (extra.description) book.description = extra.description;
    if (extra.publishedDate) book.publishedDate = extra.publishedDate;
    if (extra.language) book.language = extra.language;
    if (!book.publisher && extra.publisher) book.publisher = extra.publisher;
    if (!book.category && extra.categories && extra.categories.length) {
      book.category = extra.categories[0];
    }
    book.previewLink = extra.previewLink || book.previewLink || null;
    book.embeddable = book.embeddable === undefined ? extra.embeddable : book.embeddable;
    book.infoLink = extra.infoLink || book.infoLink || null;
  }
  return book;
}

// ---------- merge + firstSeen ----------
function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { lastScrapedAt: null, books: [] };
  }
}

function saveCache(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function merge(rawBooks, existingBooks) {
  const byKey = new Map();
  for (const b of existingBooks) byKey.set(stableKey(b), b);

  for (const raw of rawBooks) {
    const key = stableKey(raw);
    const existing = byKey.get(key);
    const sourceEntry = { name: raw.source, url: raw.url, price: raw.price ?? null };

    if (existing) {
      const sources = (existing.sources || []).filter((s) => s.name !== raw.source);
      sources.push(sourceEntry);
      existing.sources = sources;
      if (raw.author && !existing.author) existing.author = raw.author;
      if (raw.publisher) existing.publisher = raw.publisher;
      if (raw.category) existing.category = raw.category;
      if (raw.isbn && !existing.isbn) existing.isbn = raw.isbn;
      if (raw.publishedDate && !existing.publishedDate) existing.publishedDate = raw.publishedDate;
      if (raw.cover && !existing.cover) existing.cover = raw.cover;
    } else {
      byKey.set(key, {
        title: raw.title,
        author: raw.author || null,
        publisher: raw.publisher || null,
        category: raw.category || null,
        isbn: raw.isbn || null,
        cover: raw.cover || null,
        description: null,
        publishedDate: raw.publishedDate || null,
        language: null,
        firstSeen: todayStr(),
        sources: [sourceEntry],
      });
    }
  }
  return Array.from(byKey.values());
}

async function runScraper({ enrich = true } = {}) {
  console.log('[scraper] başladı:', new Date().toISOString());

  const rawBooks = [];
  const sources = [
    { name: 'kitapyurdu', fn: scrapeKitapyurdu },
    { name: 'idefix', fn: scrapeIdefix },
    { name: 'can', fn: scrapeCan },
    { name: 'iletisim', fn: scrapeIletisim },
    { name: 'ithaki', fn: scrapeIthaki },
    { name: 'iskultur', fn: scrapeIskultur },
    { name: 'yky', fn: scrapeYky },
    { name: 'everest', fn: scrapeEverest },
    { name: 'kirmizikedi', fn: scrapeKirmizikedi },
    { name: 'dogan', fn: scrapeDogan },
    { name: 'ayrinti', fn: scrapeAyrinti },
    { name: 'jaguar', fn: scrapeJaguar },
    { name: 'ketebe', fn: scrapeKetebe },
    { name: 'metis', fn: scrapeMetis },
  ];

  for (const { name, fn } of sources) {
    try {
      const found = await fn();
      rawBooks.push(...found);
      console.log(`[scraper] ${name}: ${found.length} kitap`);
    } catch (e) {
      console.warn(`[scraper] ${name} kaynağı atlandı (hata): ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const cache = loadCache();
  let books = merge(rawBooks, cache.books);
  const year = String(new Date().getFullYear());
  const pruned = books.filter((b) => b.firstSeen && b.firstSeen.startsWith(year));
  if (pruned.length !== books.length) {
    console.log(`[scraper] ${year} dışı eski kayıtlar temizlendi: ${books.length - pruned.length}`);
  }
  books = pruned;
  console.log(`[scraper] birleştirildi: ${books.length} benzersiz kitap (${year} yılı)`);

  books = applyFilters(books);

  if (enrich) {
    const toEnrich = books.filter((b) => !b.cover || !b.isbn).slice(0, MAX_ENRICH);
    console.log(`[scraper] ${toEnrich.length} kitap zenginleştirilecek`);
    for (let i = 0; i < toEnrich.length; i++) {
      try {
        await enrichBook(toEnrich[i]);
        console.log(`[scraper]   zenginleştirme ${i + 1}/${toEnrich.length}: ${toEnrich[i].title}`);
      } catch (e) {
        console.warn(`[scraper]   zenginleştirme hatası: ${e.message}`);
      }
      await sleep(DELAY_MS);
    }
  }

  books = applyFilters(books);

  saveCache({ lastScrapedAt: new Date().toISOString(), books });
  console.log('[scraper] tamamlandı, cache yazıldı:', DATA_FILE);
  return books.length;
}

if (require.main === module) {
  runScraper()
    .then((n) => {
      console.log(`[scraper] toplam ${n} kitap.`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[scraper] HATA:', e);
      process.exit(1);
    });
}

module.exports = {
  runScraper,
  loadCache,
  merge,
  stableKey,
  todayStr,
  parseKitapyurduHtml,
  parseIdefixHtml,
  parseCanHtml,
  parseIletisimRss,
  parseIthakiHtml,
  parseIskulturHtml,
  parseYkyHtml,
  parseEverestHtml,
  parseKirmizikediHtml,
  parseDoganHtml,
  parseAyrintiHtml,
  parseJaguarHtml,
  parseKetebeHtml,
  parseMetisHtml,
};
