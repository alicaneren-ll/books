// filters.js — dini/İslami içerikli kitapları ve dini ağırlıklı yayınevlerini liste dışı bırakır.
// Blok listeleri normalleştirilmiş (küçük harf, TR) terimlerdir; elle düzenlenebilir.

const BLOCKED_CATEGORY_TERMS = [
  'islam', 'islami', 'islamiyet', 'islamcilik', 'musluman', 'muslumanlik',
  'din', 'dini', 'dinler', 'dindar', 'dinbilim',
  'kuran', 'tefsir', 'meal', 'meali', 'hadis', 'hadisler', 'siyer', 'siret',
  'ilmihal', 'tasavvuf', 'akaid', 'fetva', 'dua', 'dualar', 'ibadet', 'ibadetler',
  'allah', 'peygamber', 'namaz', 'oruc', 'hac', 'umre', 'zekat', 'cihad', 'sehadet',
  'religion', 'religious', 'islamic', 'quran', 'koran', 'hadith', 'sufism', 'sufi',
  'theology',
];

const BLOCKED_TITLE_TERMS = [
  'islam', 'islami', 'islamiyet', 'islamcilik', 'musluman', 'muslumanlik',
  'kuran', 'tefsir', 'meal', 'meali', 'hadis', 'hadisler', 'siyer', 'siret',
  'ilmihal', 'tasavvuf', 'akaid', 'fetva', 'dualar', 'ibadet', 'ibadetler',
  'allah', 'peygamber', 'namaz', 'oruc', 'umre', 'zekat', 'cihad',
  'quran', 'koran', 'hadith', 'sufism', 'sufi',
];

const BLOCKED_PUBLISHER_TERMS = [
  'diyanet', 'ensar', 'beyan yayin', 'insan yayin', 'insan kitap', 'iz yayin',
  'gelenek yayin', 'pinar yayin', 'kaknus', 'semerkand', 'hayrat', 'envar',
  'ufuk yayin', 'beka', 'server yayin', 'nesil yayin',
];

// Sınav hazırlığı / test kitabı sinyalleri (başlıkta token tam eşleşme)
const BLOCKED_EXAM_TITLE_TERMS = [
  'test', 'sinav', 'sinavlar', 'sinavlara',
  'yks', 'tyt', 'ayt', 'lgs', 'kpss', 'dgs', 'ales', 'yds', 'ygs', 'lys', 'msu', 'oabt', 'tus', 'dus',
];

// Sınav hazırlığı sinyalleri (başlıkta substring; "sinav" dışında yanlış pozitif yok)
const BLOCKED_EXAM_SUBSTRINGS = ['sinav', 'deneme sinavi', 'deneme seti', 'soru bankasi'];

// "deneme": yalnızca sınav amaçlıysa engelle (edebi "denemeler" kalır)
const EXAM_DENEME_SUBJECT_TOKENS = ['matematik', 'turkce', 'fen', 'biyoloji', 'fizik', 'kimya', 'cografya', 'geometri', 'ingilizce', 'sosyal'];

function isExamDenemeTitle(ts, n) {
  const denemeish = ts.some((t) => t.startsWith('deneme'));
  if (!denemeish) return false;
  if (/\d+\s*deneme|deneme\s*\d+/.test(n)) return true;
  if (ts.some((t) => BLOCKED_EXAM_TITLE_TERMS.includes(t))) return true;
  if (/deneme\s*(sinav|seti?)/.test(n)) return true;
  if (ts.some((t) => EXAM_DENEME_SUBJECT_TOKENS.includes(t))) return true;
  return false;
}

function isExamBook(book) {
  const title = normalize(book.title || '');
  const ts = tokens(book.title || '');
  if (BLOCKED_EXAM_TITLE_TERMS.some((t) => ts.includes(t))) return true;
  if (BLOCKED_EXAM_SUBSTRINGS.some((s) => title.includes(s))) return true;
  if (isExamDenemeTitle(ts, title)) return true;
  const cat = normalize(book.category || '');
  if (cat.includes('sinav') || cat.includes('soru bankasi')) return true;
  return false;
}

function normalize(s) {
  return (s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/[’‘`´]/g, "'")
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u')
    .replace(/[â]/g, 'a')
    .replace(/[î]/g, 'i')
    .replace(/[û]/g, 'u');
}

function tokens(s) {
  const t = normalize(s).replace(/kur'?an/g, 'kuran');
  return t.split(/[^0-9a-zçğıöşü]+/).filter(Boolean);
}

function matchesAnyToken(text, terms) {
  const ts = tokens(text);
  return ts.some((tok) => terms.includes(tok));
}

function matchesAnySubstring(text, terms) {
  const t = normalize(text);
  return terms.some((term) => t.includes(term));
}

function applyFilters(books, { log = true } = {}) {
  let blocked = 0;
  const kept = (books || []).filter((b) => {
    const byCategory = matchesAnyToken(b.category || '', BLOCKED_CATEGORY_TERMS);
    const byPublisher = matchesAnySubstring(b.publisher || '', BLOCKED_PUBLISHER_TERMS);
    const byTitle = matchesAnyToken(b.title || '', BLOCKED_TITLE_TERMS);
    const byExam = isExamBook(b);
    if (byCategory || byPublisher || byTitle || byExam) {
      blocked++;
      if (log) {
        const why = [byCategory && `kategori:${b.category}`, byPublisher && `yayınevi:${b.publisher}`, byTitle && 'başlık', byExam && 'sınav/test'].filter(Boolean).join(', ');
        console.warn(`[filters] engellendi (${why}): ${b.title}`);
      }
      return false;
    }
    return true;
  });
  if (log && blocked) console.warn(`[filters] ${blocked} kitap engellendi, kalan: ${kept.length}`);
  return kept;
}

module.exports = {
  applyFilters,
  normalize,
  tokens,
  isExamBook,
  BLOCKED_CATEGORY_TERMS,
  BLOCKED_TITLE_TERMS,
  BLOCKED_PUBLISHER_TERMS,
  BLOCKED_EXAM_TITLE_TERMS,
  BLOCKED_EXAM_SUBSTRINGS,
};
