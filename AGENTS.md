# AGENTS.md — Oturum Başlangıç Talimatları

## Zorunlu: Her oturum başlangıcında
1. `DEVAM.md` dosyasını oku.
2. Kullanıcıya **kısa bir özet** göster:
   - Proje durumu ve son yapılan iş (Uygulama Notları bölümünden 2-4 satır)
   - Yapılacak işler listesi:
     - **Sıradaki İşler** (öncelikli; sırayla)
     - **Review Bulguları** (düzeltilmediyse)
     - **Yapılabilecek İyileştirmeler** (opsiyonel)
3. Kullanıcıya bir sonraki adımı sor; "kaldığımız yerden devam" beklenir.

## Proje
Türkçe kullanıcı; yanıtlar Türkçe olmalı.

Kitapyurdu + idefix + yayınevi akışlarından "2026 yılı içinde ilk görülen" kitapları derleyen,
yasal (robots.txt/resmî API uyumlu) Node.js + saf HTML/CSS/JS site.

## Komutlar
- `npm start` — Express sunucusu (http://localhost:3000)
- `npm run scrape` — veriyi yeniden çek (cache `data/weekly.json`)
- `npm run build:static` — bağımsız tek HTML `index.html` üretir

## Kurallar (kısa)
- Yalnızca robots.txt izinli kaynaklar; işlemler `DEVAM.md`'deki yasal çerçeveye uyar.
- Kod değişikliği sonrası `npm run scrape` + `npm run build:static` gerekliyse çalıştır.
- `DEVAM.md`'yi güncel tut; kararları/notları oraya işle.
