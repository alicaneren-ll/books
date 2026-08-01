# DEVAM.md — 2026 Yeni Çıkan Kitaplar Projesi

Kaldığımız yerden devam etmek için proje durumu ve kararlar kaydı.
Son güncelleme: 2026-08-01

## Proje Amacı
Çoklu kaynaktan derlenen, **2026 yılı içinde ilk kez kaynaklarda görülen kitapların**
tamamını gösteren, HTML tabanlı bir web sitesi. İşlemler yasal olmalı
(robots.txt + resmî API uyumu).

## Klasör
`C:\Users\h_ali\Projects\books` (boş başlandı)

## Onaylanmış Kararlar
1. **"2026 yılı" tanımı = `firstSeen` yılı:** Kitap, kaynak akışında ilk görüldüğü
   takvim yılında "o yılın kitabı" sayılır. Kaynaklar kesin çıkış tarihi vermediği için
   tek güvenilir yöntem budur. (Hafta konsepti terk edildi — 2026-08-01.)
2. **Gösterim:** İçinde bulunulan yılda ilk kez görülen TÜM kitaplar tek listede.
   Kaynaklar yıl boyunca birikir (merge ile korunur); yıl dışı eski kayıtlar her
   scrape'te temizlenir. Önceki hafta/yıl sekmesi YOK.
3. **Filtreleme:** Başlık/yazar/yayınevi araması + **Yayınevi ve Kategori çipleri**
   (kategoriler idefix `categoryTree` leaf'inden, yayınevi Kitapyurdu/Google'dan; değeri
   olmayan kitaplar çip üretmez, yalnızca "Tümü" ile görünür). Tür/etiket YOK.
4. **Backend dili:** Node.js (Express + Cheerio + node-cron).
5. **Kaynaklar:**
   - Kitapyurdu "Yeni Çıkanlar" → `index.php?list_id=630&route=product/best_sellers` (robots.txt İZİNLİ)
   - Idefix "Yeni Çıkan Kitaplar" → `/yeni-cikan-kitaplar-l-158` (robots.txt'te açıkça `Allow`)
   - Can Yayınları → `/yeni-cikanlar` (robots `Allow /`)
   - İletişim Yayınları → resmî RSS `/rss/yeni-cikanlar` (robots `Allow /`, yalnız `dergiler/birikim/*` yasak)
   - İthaki Yayınları → `ithakiyayingrubu.com/yeni-cikanlar` (robots `Allow /`, admin/arama/cart yasak)
   - Zenginleştirme: Google Books API (ISBN ile; kapak, özet, çıkış tarihi), yedek: Open Library API
9. **Zorunlu yayınevleri (2026-08-01, kullanıcı isteği):** Aşağıdaki yayınevleri
   "mutlaka" kaynak olarak kapsanır; her biri ayrı kaynak. Can ve İletişim zaten
   kaynaktı; 9 yeni eklendi:
   - İş Bankası Kültür → `iskultur.com.tr/yeni-cikanlar`
   - Yapı Kredi → `yapikrediyayinlari.com.tr/kitap/yeni-cikanlar` (bu ortamdan 403)
   - Can → `canyayinlari.com/yeni-cikanlar` (bu ortamdan 403)
   - İletişim → RSS (mevcut)
   - Everest → `everestyayinlari.com/ana-sayfa/yeni-cikanlar`
   - Kırmızı Kedi → `kirmizikedi.com/yenicikanlar`
   - Doğan Kitap → `dogankitap.com.tr/kitaplarimiz/yeni-cikanlar`
   - Ayrıntı → `ayrintiyayingrubu.com/yayim-tarihi/<ay>-<yil>/` (ay arşivi, dinamik)
   - Jaguar → `jaguarkitap.com/kitaplar/yeni/`
   - Ketebe → `ketebe.com/yeni-kitaplar`
   - Metis → `metiskitap.com/catalog/newreleases`
   Hepsi robots.txt `Allow` (doğrulandı; Metis'te robots.txt yok). Ketebe dini içerikli
   yayınlar da yapıyor — Karar #7 (dini kitaplar çıkar) KAYNAK BAĞIMSIZ tüm kaynaklarda
   uygulanır; Ketebe'nin yalnız dini/İslami başlıkları elenir, edebi/felsefi yayınları kalır.
10. **Kapak/ISBN/tarih koruma (2026-08-01):** `merge()` yeni kitapta kaynağın `cover`,
    `isbn`, `publishedDate` alanlarını artık korur (önceden kayboluyordu); mevcut kitaplara
    da boşsa eklenir. Böylece yayınevi kaynaklarındaki kapaklar (Google Books kapak
    yerine) ve İletişim/İthaki tarihleri listeye geçer.
6. **Veri alanları:** başlık, yazar, yayınevi, fiyat, kaynak URL, ISBN, kapak, özet,
   çıkış tarihi (varsa), `firstSeen`.
7. **İçerik engeli (2026-08-01):** Dini/İslami içerikli kitaplar ve dini ağırlıklı
   yayınevleri LİSTEDEN TAMAMEN ÇIKARILIR (cache'e yazılmaz, geri gelmez).
   `filters.js` içinde üç normalleştirilmiş blokliste:
   - `BLOCKED_CATEGORY_TERMS` — islam, din, kuran, tefsir, meal, hadis, siyer, tasavvuf, ilmihal, ... (token tam eşleşme)
   - `BLOCKED_PUBLISHER_TERMS` — diyanet, ensar, beyan, insan yayın, iz yayın, gelenek, pınar, kaknüs, semerkand, hayrat, envar, ufuk, beka, server, nesil (substring)
   - `BLOCKED_TITLE_TERMS` — kategori null olan dini kitaplar için başlık yedeği (örn. İthaki "İslam'da Kadın")
   Filtre: merge sonrası + zenginleştirme sonrası (Google'dan kategori gelebilir) + API/static
   tarafında (eski cache'e karşı güvence) uygulanır.
8. **Sınav/hazırlık engeli (2026-08-01):** Başlıkta `test`/`sınav` geçen kitaplar ile
   SIRAV AMAÇLI `deneme` kitapları LİSTEDEN ÇIKARILIR; edebi "Denemeler" KALIR.
   `filters.js` `isExamBook()`: kategori substring'i `sınav` içeriyorsa engelle; başlıkta
   `test`/`sinav` token'ı varsa engelle (tam eşleşme, "testi" yanlış pozitifi önlenir);
   `deneme*` token'lı başlıklarda `\d+ deneme`, sınav token'ı, "deneme sınavı/seti" veya
   ders adı (matematik/türkçe/fen/biyoloji/fizik/kimya/coğrafya/geometri/ingilizce/sosyal)
   varsa engelle. Liste: `BLOCKED_EXAM_TITLE_TERMS` (test, sinav, sinavlar, sinavlara, yks,
   tyt, ayt, lgs, kpss, dgs, ales, yds, ygs, lys, msu, oabt, tus, dus) +
   `BLOCKED_EXAM_SUBSTRINGS` (sinav, deneme sinavi, deneme seti, soru bankasi).
   Karar: kullanıcı onayı — "Sınav amaçlı deneme engellensin; edebi denemeler kalsın".
9. **Türkçe diyakritik eşleme (2026-08-01):** `normalize()` Türkçe karakterleri ASCII'ye
   eşler (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u, â/î/û → a/i/u). Bloklisteler ASCII formda
   yazılır (ör. "sınav" terimi `sinav`, "Kaknüs" → `kaknus`, "Pınar" → `pinar`,
   "Müslüman" → `musluman`); böylece konsol/kaynak kodlaması farkından bağımsız eşleşir.
   Token + substring karşılaştırmaları normalleştirilmiş metin üzerinde yapılır.
11. **Amazon.com.tr EKLENMEZ (2026-08-01, kullanıcı kararı):** Fiyat/özet kaynağı olarak
    Amazon.com.tr kapsanmaz. Gerekçe: (a) robots.txt teknik olarak `/dp/` ürün sayfalarını
    ve `/s?k=` aramasını `*` için yasaklamasa da Amazon Kullanım ve Satış Şartları ürün
    listeleri/özellikleri/fiyatların otomatik toplanmasını (data mining, robots, scraping)
    AÇIKÇA yasaklıyor — projenin yasal çerçevesiyle çelişir; (b) Amazon güçlü anti-bot
    (CAPTCHA, rate-limit, IP engeli) kullanıyor, sunucudan düz fetch kırılgan/çalışmaz;
    (c) resmî API (PA-API v5) deprecate edildi, yerine Creators API geçiyor — Associates
    üyeliği + API anahtarı gerekir. Mevcut özet/kapak (Google Books + Open Library) ve
    fiyat (Kitapyurdu/idefix/yayınevleri) kaynakları yeterli kabul edildi.

## Araştırma Bulguları (doğrulandı)
- Kitapyurdu/Idefix yeni-çıkan sayfaları sunucu tarafında render → headless tarayıcı GEREKMEZ.
- Kitapyurdu `robots.txt`: `/image/`, `/img/`, `/system/` yasak → kapak görseli çekilmez.
- Idefix `robots.txt`: arama, `/detay`, görsel yolları yasak; `-l-158` açıkça izinli.
- Goodreads: API yeni anahtar vermiyor (Aralık 2020), `/api`, `/search`, `/review` Disallow,
  ToS scraping yasak → **kullanılmayacak.**
- Google Books: anahtarsız ~1000 istek/gün/IP; Türkçe kapsamı iyi; `publishedDate`
  Türkçe kitaplarda çoğu zaman sadece yıl/ay → hafta hesabı buna güvenilmez.
- Open Library: CC0, anahtar yok, en düşük yasal risk; Türkçe kapsamı zayıf.
- **Yayınevi kaynakları robots (doğrulandı):**
  - Can `canyayinlari.com/robots.txt`: `Allow /` → `/yeni-cikanlar` İZİNLİ.
  - İletişim `iletisim.com.tr/robots.txt`: `Allow /`, yalnız `dergiler/birikim/*` Disallow;
    `/rss/yeni-cikanlar` RSS'i İZİNLİ (resmî feed; ISBN + özet + çıkış tarihi verir).
  - İthaki `ithakiyayingrubu.com/robots.txt`: `Allow /`; admin/arama/cart/account yasak,
    `/yeni-cikanlar` liste sayfası İZİNLİ.
  - **Not:** Can Yayınları bu çalışma ortamından (IP) 403 dönüyor — tarayıcı UA ile de.
    Scraper kaynak bazlı try/catch ile zarifçe atlar; kullanıcının kendi IP'sinde
    çalışabilir. Seçiciler HTML'den doğrulandı (`div.item.itemauto` + `data-dl*`).
  - Zorunlu yayınevleri robots (2026-08-01, doğrulandı): iskultur (WP, Allow), yky (WP,
    Allow — **bu ortamdan 403**, tüm UA), everest (Magento, `/*?` Disallow ama `/*?p=`
    ve `/*?page=` Allow), kirmizikedi (Angular, `/yenicikanlar` Allow), dogan (Allow,
    sitemap `/cache/feed/` altında — robots ile çelişki ama liste sayfası Allow),
    ayrinti (Cloudflare `Allow /`; Content-Signal `ai-train=no` — yalnız olgusal meta),
    jaguar (Yoast, tümü Allow), ketebe (T-Soft, `Allow /`; Python/Wget Disallow →
    tarayıcı benzeri UA gerekir, bot UA'mız `*` kuralına girer), metis (robots.txt YOK).

## Yasal Çerçeve (zorunlu kurallar)
- Sadece robots.txt izinli sayfalar çekilir; yasak kaynaklara dokunulmaz.
- Yalnızca olgusal meta veri (başlık, yazar, yayınevi, fiyat, URL). Yorum/tanıtım yazısı/
  görsel kopyalanmaz.
- Küçük, seçilmiş haftalık liste (~15-20 kitap); tam veritabanı dökümü yok, veri biriktirilmez.
- Her kitap kartı kaynak satıcı sayfasına link verir (atıf).
- KVKK: kişisel veri / kullanıcı içeriği toplanmaz.
- Düşük istek hacmi (haftada 2-4), 1-2 sn bekleme, cache'li.
- Site bilgilendirme amaçlı; ticari kullanım için kaynakların yazılı izni gerekir.

## Hedef Mimari
```
books/
├── package.json      # express, cheerio, node-cron
├── server.js         # Express: API + statik + cron (haftalık, Pazartesi)
├── scraper.js        # Çoklu kaynak, dedupe, firstSeen, Google/OpenLibrary zenginleştirme
├── filters.js        # Dini/İslami içerik + yayınevi bloklisteleri, applyFilters
├── data/
│   └── weekly.json   # Derlenmiş veri cache'i (elle düzenlenebilir)
└── public/
    ├── index.html    # "Bu Haftanın Yeni Kitapları" + arama + modal
    ├── styles.css    # Koyu/ladin tema, responsive
    └── app.js        # fetch('/api/books'), arama, kart+modal render
```

## API Planı
- `GET /api/books` — güncel haftanın kitapları + hafta aralığı
- `POST /api/refresh` — scraper'ı şimdi çalıştırır (local)
- Haftalık otomatik çekim: node-cron (Pazartesi)

## Kurulum & Çalıştırma (hedef)
```
npm install
npm start            # http://localhost:3000
```

## Sıradaki Adımlar (TODO)
- [x] `DEVAM.md` karar kaydı
- [x] `package.json` + bağımlılıklar (express, cheerio, node-cron)
- [x] `scraper.js`: Kitapyurdu/Idefix çekme + ayrıştırma + dedupe + firstSeen
- [x] Google Books / Open Library zenginleştirme (ISBN ile)
- [x] `weekly.json` şema + ilk örnek veri
- [x] `server.js`: API endpoint'leri + statik sunum + cron
- [x] `public/` frontend (index.html, styles.css, app.js)
- [x] Yasal kontrollerin README/LEGAL.md olarak dokümantasyonu
- [x] Uçtan uca test: scrape → API → sayfa görünümü → arama

## Uygulama Notları (son durum)
- Scraper çalışıyor: `npm run scrape` → ~30 sn, 45 benzersiz kitap, cache `data/weekly.json`
- Kitapyurdu seçicileri: `.ky-product` → `.ky-product-title`, `.ky-product-author a`,
  `.ky-product-publisher a`, `.ky-product-sell-price`; ürün URL'si `kitap/<slug>/<id>.html`
  (`cleanPublisher` ile "-KAMPANYA" soneki temizlenir)
- idefix: Next.js `__NEXT_DATA__` JSON'u ayrıştırılır (`categoryData.items[]`),
  "Son Eklenen" sıralaması için `?sort=desc_added` kullanılır; başlıktan yayınevi
  soneki `cleanIdefixTitle` ile temizlenir; **kategori leaf'i** `item.categoryTree` son
  elemanından alınır (`category` alanı)
- Filtre verisi: `category` idefix leaf / Google `categories[0]`; `publisher` Kitapyurdu /
  Google `volumeInfo.publisher`; merge'de kaynak veri otoriterdir (cache'deki eski değer
  yeni ham veriyle güncellenir); örnek kapsam: kategori 24/45, yayınevi 20/45
- Frontend filtreleri: `public/index.html` toolbar altında `#category-chips` +
  `#publisher-chips` (tümü otomatik üretilir, boş değer çip üretmez); `app.js`'de
  `activeCategory`/`activePublisher` + `render()` içinde arama ile birlikte uygulanır;
  kartta `card-category` rozeti; statik modda da aynı çalışır
- Google Books bu ortamda anonim isteklerde **429** döndürüyor → circuit breaker ile
  Open Library yedeğine geçilir; kullanıcının kendi IP'sinde veya `GOOGLE_BOOKS_API_KEY`
  ile çalışır. Yeni Türkçe kitaplar Open Library'de genelde bulunamadığından kapaklar
  yer tutucu olarak gösterilir (varsayılan, istenen davranış)
- Türkçe karakter + JS regex `\b` sorunu: idefix sonek temizliğinde regex yerine
  `endsWith` kullanılır
- API: `GET /api/books` (hafta + kitaplar), `POST /api/refresh` (kilitli), `GET /api/health`
- Cron: Pazartesi 09:00 haftalık çekim
- Yayınevi kaynakları (2026-08-01 eklendi, kaynak başına en yeni ilk 15 kitap):
  - Can `scrapeCan`: `div.item.itemauto` + `data-dlname`/`data-dlid`(ISBN)/`data-dlurl`/
    `data-dlbrand`/`data-dlcategory`(son segment)/`.price .price-sales`; yazar `p.product-brnd`.
    Bu ortamda 403 → atlanıyor.
  - İletişim `scrapeIletisim`: RSS XML elle split + regex; başlık HTML etiketleri temizlenir
    (`&lt;i&gt;` vb.), son `" - "` ile başlık/yazar; `g:id` → ISBN; `pubDate` → publishedDate;
    yayınevi sabit "İletişim Yayınları". Tanıtım özeti kopyalanmaz (yasal).
  - İthaki `scrapeIthaki`: `.products-list__item`; başlık `.product-card__name a`,
    yazar `.product-box_specification-attribute-value`, fiyat `.custom-sale_price`,
    kategori inline script `"item_category":"..."`, tarih `.product-card__description` (DD.MM.YYYY).
    Kartta ISBN yok → zenginleştirme ile gelir.
- Zorunlu yayınevleri ekleri (2026-08-01, kaynak başına ilk 15; hepsi server-render HTML):
  - İş Bankası `scrapeIskultur`: `a.product`; başlık `h3`, yazar `p.yazar`,
    kapak `.img img @src`; fiyat `p.fiyat` özel `parseIskulturPrice` ile (format
    `89.<small>60</small> TL` — nokta ondalık; genel `parsePrice` noktayı binlik sanıp 8960
    yapıyordu).
  - YKY `scrapeYky`: `.urunList`; başlık `h3`, yazar `p.author`, fiyat `.price`,
    kapak `figure img @src`. **Bu ortamdan 403** (tüm UA) → atlanır; kullanıcı IP'sinde çalışır.
  - Everest `scrapeEverest`: Magento `li.item.product.product-item`; başlık
    `.product-item-link`, kapak `img.product-image-photo @data-src` (lazy), fiyat önce
    `.special-price [data-price-amount]` sonra `.price-final_price [data-price-amount]`
    (indirimli/özel fiyat, old-price'a düşmemek için). Yazar listede yok.
  - Kırmızı Kedi `scrapeKirmizikedi`: Angular ama kartlar server-render `div.product-box`;
    başlık `.product-name-label`, marka `.brand-name`, fiyat `.price-box .cmp-price`
    (indirimli satış), kapak `.product-img .image-box img`. Yazar listede yok (bazı
    başlıklara karışmış, ayırt edilemez).
  - Doğan `scrapeDogan`: `#kitaplistesi div.kitap`; başlık `.k-baslik p` (span alt başlık
    clone ile çıkarılır), yazar `.k-yazar`, kategori `.k-kategori`, yayın grubu `.k-firma`
    (Doğan Kitap/DEX/Novus — publisher olarak), kapak `a.kitapkare img`. **Fiyat yok.**
  - Ayrıntı `scrapeAyrinti`: ay arşivi `ayrintiyayingrubu.com/yayim-tarihi/<ay>-<yil>/`
    (güncel ay yoksa önceki ay denenir); `ul.products li.product`; başlık
    `.cmsmasters_product_title a`, kategori `.cmsmasters_product_cat a`, fiyat
    `.price ins .woocommerce-Price-amount` (indirimli), kapak `.cmsmasters_product_img img`.
    Yazar kartta yok. robots Content-Signal `ai-train=no` — yalnız olgusal meta veri alınır.
  - Jaguar `scrapeJaguar`: `article.tease-product`; başlık `meta[itemprop=name]` (en temiz),
    yazar `h2.card-title small`, kapak `meta[itemprop=image]`. **Fiyat yok** (sitede gösterilmiyor).
  - Ketebe `scrapeKetebe`: T-Soft `div.productItem`; başlık `a.vitrin-urunadi`, yazar
    `a.vitrin-model`, fiyat `span[itemprop=price] @content`, kapak `span[itemprop=image]`,
    link `a.detailLink`; **kategori** sayfa çapındaki `PRODUCT_DATA.push(JSON.parse('...'))`
    script'lerinden `span[itemprop=url]` ile eşleştirilir (JSON'da `\"` escape'i `\\"`→`"`
    ile çözülür; JSON.stringify `\uXXXX` escape'leri `decodeUnicodeEscapes` ile çözülür).
  - Metis `scrapeMetis`: `#NewBooksPanel tr:has(td.ItemDescription)`; başlık
    `a.MTitle.MClearPadding`, yazar `a.MSubTitle.Author`, kapak `td.ItemImage img`.
    **Fiyat yok** listede (yalnız detayda). robots.txt yok.
- Filtre fiksleri (2026-08-01, kaynak genişlemesiyle ortaya çıktı):
  - Ketebe "Kur'an'ın Erişilmez Üstünlüğü" sızıyordu — başlıktaki kesme işareti **kıvrımlı**
    `’` (U+2019); `/kur'?an/` düz `'` yakaladığı için "kur"+"an" ayrı token oluyordu.
    `normalize()` artık `’‘` → `'` yapar; "kur'an" → "kuran" token'ı engellenir.
  - Ketebe dini başlıkları için ayrıca kaynak bağımsız filtre (Karar #7) yeterli.
- Filtre (`filters.js`): scrape'te dini kitap engeli idefix "İslamiyet" kategorisi
  ("Altınoluk Sohbetleri", "Peygamberlerin Hayatı" serileri) üzerinden doğrulandı.
  Cache her scrape'te temizlenir; API + static build de `applyFilters` uygular
  (eski cache güvencesi).
- Sınav/test/deneme engeli (2026-08-01): `isExamBook` + `applyFilters`'a `|| byExam`
  bağlandı. Sentetik testler: TYT denemeleri, "Deneme Sınavı", "KPSS Soru Bankası",
  "Soru Bankası", "Test Çözme Teknikleri", "Sınavlara Hazırlık", "Fen Denemeleri"
  engelleniyor; "Denemeler" (Montaigne), "Deneme ve Eleştiri", "Deneme Üzerine",
  "Kişilik Testi", "Ofsayt Bilen Kadınlar" (alt dize "ayt") yanlış pozitif vermiyor.
  Canlı scrape: 11 sınav/hazırlık kitabı engellendi (KPSS deneme setleri, TYT kampı,
  soru bankaları, 5/8. sınıf denemeleri vb.) → 65 kitap kaldı.
- `normalize()` diyakritik eşleme fix'i (2026-08-01): Türkçe karakterlerin ASCII'ye
  eşlenmemesi nedeniyle "sınavlara" ≠ "sinavlara", "Kaknüs" ≠ "kaknus" gibi kaçaklar
  oluşuyordu; eşleme eklendi (bkz. Kararlar #9).
- Kategori çoklu seçim (2026-08-01): `public/app.js` — `activeCategory` (tekil) →
  `activeCategories` (Set). `chipHtml` artık `isActive(v)` callback'i alıyor; kategori
  çipleri toggle (OR), "Tümü" `clear()`; `render()` `activeCategories.has(b.category)`
  ile filtreliyor; yayınevi çipleri tekil kaldı. Boş sonuçta "Seçilen filtrelerle
  eşleşen kitap bulunamadı." mesajı. Sentetik doğrulama: 19 kategori, 1+7=8 çoklu
  eşleşme, temizlemede 65. `npm run build:static` yeniden üretildi (51 KB).
- Yayınevi çoklu seçim (2026-08-01): `activePublisher` (tekil) → `activePublishers` (Set);
  aynı toggle/"Tümü" mantığı. Doğrulama: 17 yayınevi, "Ayrıntı"(3) + "Çınar"(1) = 4,
  temizlemede 168. Kategori ∩ Yayınevi = AND. Static 92 KB.
- `scraper.js` `toDateStr(d)` eklendi (RSS/card tarihleri için).
- Zenginleştirme fix: `book.cover`/`description`/`publishedDate`/`language` artık yalnızca
  dolu geldiğinde yazılır (null kaynaklı veri kaybı durdu).
- Konsept değişikliği (2026-08-01, kullanıcı isteği): "son hafta" yerine **2026 yılı tüm
  kitaplar**. `server.js` `apiBooks()` ve `build-static.js` artık `firstSeen` yılı =
  güncel yıl olan kitapları döner; `scraper.js` merge sonrası yıl dışı kayıtları temizler
  (yıl sınırı, büyüme kontrolü). API şekli `week` → `year`/`label`. Cache yıl boyunca
  birikir (mevcut `merge` zaten biriktiriyordu); kaynak yeni-çıkan sayfalarından her
  hafta düşen kitaplar cache'te kalır. Cron haftalık (Pazartesi) duruyor.
- Dağıtım (2026-08-01, kullanıcı isteği): Wix'te "Embed a Website" ile gösterilecek
  **GitHub Pages** adresi. `.github/workflows/weekly.yml`: Pazartesi 06:00 UTC (09:00 TR)
  + `workflow_dispatch`; Node 18 → `npm ci` → `npm run scrape` → `npm run build:static` →
  `data/weekly.json` + `index.html`'i repo'ya commit+push (birikim korunur) → Pages'e
  deploy (yalnız `./index.html`). `data/weekly.json` artık repo'da (`.gitignore`'dan
  çıkarıldı — yıllık birikim için şart). GitHub Pages yalnız public repo'da ücretsiz.
  Git bu makineye winget ile kuruldu; yerel repo init + seed commit tamamlandı.
  Wix tarafında iframe sabit yükseklikte olduğundan yükseklik bol tutulur.
- **Dağıtım CANLI (2026-08-01):** `https://alicaneren-ll.github.io/books/` (GitHub
  Actions ile haftalık deploy doğrulandı). Pipeline'daki iki hata düzeltildi:
  (a) Node 18'de `File` global'i yok (undici) → workflow `node-version: 22`;
  (b) `upload-pages-artifact` dizin ister → `_site/` klasörü hazırlanıp yüklenir.
  Bulut runner kaynak kapsamı (log'dan doğrulandı): idefix, iletisim, ithaki, iskultur,
  kirmizikedi, dogan, ketebe, metis ÇALIŞIYOR; kitapyurdu, can, yky, everest, ayrinti
  bulut IP'sinden **403** (scraper atlıyor); jaguar 0 kitap; Google Books 429 → Open
  Library yedeği. Yerel makinede kitapyurdu dahil daha geniş kapsam var — ilk seed
  (kitapyurdu kitapları) repo'da olduğundan listede duruyor; ilerleyen haftalarda
  bulut runner yeni kitapyurdu kitabı ekleyemez (kapsam farkı kabul edildi).

## Review Bulguları (2026-08-01)
- [x] Tek kaynak hatası tüm scrape'i durduruyor → **DÜZELTİLDİ (2026-08-01):** `runScraper`
      kaynak dizisini kaynak bazlı try/catch ile dolaşıyor; tek kaynak çökerse diğerleri devam eder
- [x] Zenginleştirme dolu alanları null'layabiliyor → **DÜZELTİLDİ (2026-08-01):** cover/description/
      publishedDate/language yalnızca dolu geldiğinde yazılıyor (`book.x || extra.x` mantığı)
- [ ] `googleDown` circuit breaker yeniden başlatmaya kadar sıfırlanmıyor (zaman tabanlı reset)
- [ ] YKY `/kitap/yeni-cikanlar` bu ortamdan 403 (tüm UA) → kullanıcının kendi IP'sinde
      yeniden test edilecek; selectors `.urunList` HTML'den doğrulandı
- [ ] `build-static.js` `</script>` kaçışı yapmıyor (kitap başlığı/özeti script'i bozabilir)
- [ ] `build-static.js` `.replace()` eşleşmezse sessizce no-op → eksik öğe kontrolü
- [ ] Cron Pazartesi 09:00 ile manuel `/api/refresh` eşzamanlı çalışabilir (`scraping` guard'ı)

## Sıradaki İşler (2026-08-01, kullanıcı kararı)
- [x] Kategori + yayınevi filtreleri ÇOKLU seçim (önceki iş listesinden #2) → **YAPILDI (2026-08-01)**:
      `activeCategories`/`activePublishers` Set'leri; çipler toggle (grup içi OR),
      gruplar arası AND. "Tümü" ilgili Set'i temizler; boş sonuç mesajı filtreye göre değişir.
- [x] NY Times çok satanlar (önceki #1) → **İPTAL EDİLDİ (2026-08-01, kullanıcı isteği):** iş listesinden kaldırıldı.
- [x] Önceki hafta gösterimi (önceki #3) → **İPTAL EDİLDİ (2026-08-01, kullanıcı isteği):** iş listesinden kaldırıldı;
      konsept "son hafta"dan "2026 yılı tüm kitaplar"a çevrildi.
- [x] Otomatik derleme 2 hafta + prune (önceki #4) → **İPTAL EDİLDİ (2026-08-01, kullanıcı isteği):**
      iş listesinden kaldırıldı; bunun yerine yıl boyu birikim + yıl dışı prune scraper'a eklendi.

**Açık iş yok.** Konsept değişikliği (2026-08-01): `server.js`/`build-static.js` yıl bazlı
filtreler (`firstSeen` yılı); `scraper.js` yıl dışı kayıtları temizler; frontend başlıkları
ve `app.js` "hafta" → "yıl" olarak güncellendi.

## Yapılabilecek İyileştirmeler (gelecek)
- [x] Google Kitaplar Gömülü Önizleyici (Embedded Viewer): detay modalında ISBN varsa
      "Google Kitaplar önizlemesini aç" butonu → `google.books.DefaultViewer` ile
      `viewer.load('ISBN:...')`; önizleme yoksa mesaj gösterilir (dev docs'u: viewer/developers_guide)
- [x] KPSS/deneme sınavı gibi hazırlık kitaplarını liste dışı bırakmak için küratöryel filtre
      → **YAPILDI (2026-08-01):** `isExamBook`/`BLOCKED_EXAM_*` (Kararlar #8). "Denemeler"
      başlıklı edebi eserler etkilenmez. Güçlendirilecekse ders adı listesi genişletilir.
- [ ] Tür/etiket filtresi (şu an karar gereği yok)
- [ ] `GOOGLE_BOOKS_API_KEY` ile zenginleştirme kalitesini yükseltmek (ISBN/önizleme gelir)
- [ ] Veriyi arşivlemek (şu an gösterim yıl bazlıdır; önceki yıllar arşivi yok — 2026-08-01 itibarıyla istenmiyor)
