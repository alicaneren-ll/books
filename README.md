# 2026'da Yeni Çıkan Kitaplar

Kitapyurdu, idefix ve çeşitli yayınevlerinin "yeni çıkan" akışlarından derlenen
kitapları **2026 yılı** içinde ilk kez kaynaklarda görüldükleri şekliyle tek listede
gösteren, Node.js tabanlı bir web sitesi.

## Özellikler

- **Çoklu kaynak derlemesi:** Kitapyurdu, idefix ve 12+ yayınevi (robots.txt izinli sayfalar)
- **"Yıl" mantığı:** `firstSeen` ile kitapların ilk görüldüğü yıl takip edilir; 2026 içinde
  görülen tüm kitaplar listede kalır, yıl dışı kayıtlar scrape sırasında temizlenir
- **Zenginleştirme:** Google Books (yedek: Open Library) ile kapak, özet, ISBN
- **Başlık/yazar araması**, kategori/yayınevi çipleri (çoklu seçim), kaynak rozetleri, fiyatlar,
  kitap detay modalı
- **Haftalık otomatik çekim:** node-cron (Pazartesi 09:00) ile yıl boyu biriken veri
- Kapak bulunamayan kitaplar için otomatik renkli yer tutucular

## Kurulum

```bash
npm install
npm start          # http://localhost:3000
```

İsteğe bağlı: Google Books anonim API limiti (429) aşılırsa resmî anahtar kullanın:

```bash
set GOOGLE_BOOKS_API_KEY=your_key   # Windows
npm start
```

## Kullanım

| Komut | Açıklama |
|---|---|
| `npm start` | Sunucuyu başlatır (API + web sitesi + haftalık cron) |
| `npm run scrape` | Scraper'ı şimdi çalıştırır (veriyi tazeler, yıl boyu biriktirir) |
| `npm run build:static` | Bağımsız tek HTML üretir (`index.html`) |
| `POST /api/refresh` | Scraper'ı çalıştırır (web arayüzünden "derlemeyi yenile") |
| `GET /api/books` | 2026 yılı kitaplarını JSON olarak döner |
| `GET /api/health` | Sunucu durumu |

## Dosya yapısı

```
books/
├── package.json      # Bağımlılıklar: express, cheerio, node-cron
├── server.js         # Express: API + statik dosyalar + cron
├── scraper.js        # Kaynak çekme, dedupe, firstSeen, yıl filtresi, zenginleştirme
├── filters.js        # Dini/İslami + sınav/test içerik engeli (kaynak bağımsız)
├── build-static.js   # Bağımsız tek HTML üretir
├── data/
│   └── weekly.json   # Derlenmiş veri (cache) — elle düzenlenebilir
├── public/           # Frontend: index.html, styles.css, app.js
├── index.html        # build:static çıktısı
├── DEVAM.md          # Proje karar/kayıt defteri
└── LEGAL.md          # Yasal uyum notları
```

## Not

Yasal çerçeve ve kaynak izinleri hakkında bilgi için [LEGAL.md](LEGAL.md)'ye bakın.
