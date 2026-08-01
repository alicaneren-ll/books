# LEGAL.md — Yasal Uyum Notları

Bu belge, "Haftalık Yeni Çıkan Kitaplar" sitesinin veri toplama sürecinin
yasal ve etik çerçevesini açıklar. **Hukuki tavsiye değildir.**

## Kaynaklar ve izin durumu

| Kaynak | Kullanılan sayfa | robots.txt durumu | Kapak görseli |
|---|---|---|---|
| Kitapyurdu | `/index.php?list_id=630&route=product/best_sellers` | İzinli (Disallow listesinde değil) | Çekilmez |
| idefix | `/kitap-c-3307?sort=desc_added` | İzinli (`-c-3307` yasak değil; `?sort=` parametresi engellenmiyor) | Çekilmez |
| Google Books | `volumes` API | Resmî API | Evet (lisanslı hotlink) |
| Google Kitaplar Gömülü Görüntüleyici | `jsapi.js` + `DefaultViewer` | Resmî embed API (ISBN ile, yalnızca gömülebilir önizlemesi olan kitaplar) | Önizleme gösterimi |
| Open Library | `search.json` + cover API | Açık veri (CC0) | Evet (CC0) |

Kitapyurdu'nun `/image/`, `/img/`, `/system/` ve idefix'in görsel/arama/`/detay`
yolları robots.txt'te yasaklıdır; **bunlara hiçbir istek atılmaz.**

## Uygulanan kurallar

1. **robots.txt uyumu:** Yalnızca izinli sayfalar çekilir. Yasaklanmış hiçbir
   kaynak (kapak görseli, ürün detayı, arama, değerlendirmeler) çekilmez.
2. **Yalnızca olgusal meta veri:** Başlık, yazar, yayınevi, fiyat, kaynak URL.
   Kitap adı ve yazar adı gibi gerçekler telif kapsamına girmez. Yorumlar,
   tanıtım yazıları ve görseller **kopyalanmaz**.
3. **Veritabanı hakkı (FSEK/sui generis):** Kaynakların tüm veritabanı
   dökülmez; yalnızca olgusal meta veri (başlık, yazar, yayınevi, fiyat, URL)
   seçilmiş kaynakların "yeni çıkan" sayfalarından toplanır. Veri 2026 yılı için
   biriktirilir (yıl boyunca ilk kez görülen kitaplar), ancak bu bir yıllık sınırlı,
   atıflı ve yalnızca olgusal alanlardan oluşan bir listedir; kopyalanan tanıtım
   içeriği yoktur. Yıl sonunda eski kayıtlar temizlenir.
4. **Atıf:** Her kitap kartı kaynak satıcı sayfasına bağlantı verir; footer'da
   kaynak adları belirtilir.
5. **KVKK:** Kişisel veri veya kullanıcı içeriği toplanmaz; yalnızca
   yayımlanmış eser/yazar bilgileri kullanılır.
6. **Düşük hacim & hız:** Haftada 2-4 kaynak isteği + sınırlı API çağrısı,
   istekler arası 1.5 sn bekleme, sonuçlar cache'lenir.
7. **Kullanım amacı:** Site bilgilendirme amaçlıdır.

## Kullanıcının sorumluluğu

- Kaynak sitelerin **Kullanım Koşulları** değişebilir; robots.txt periyodik
  kontrol edilmeli, engellenen bölümler kullanımdan çıkarılmalıdır.
- **Ticari kullanım** için kaynak sitelerin yazılı izni alınmalıdır.
- Google Books anonim limitini aşarsanız `GOOGLE_BOOKS_API_KEY` ortam değişkeni
  ile resmî anahtar kullanılabilir.
- Gömülü Google Kitaplar önizlemesi, [Google Kitaplar Hizmet Şartları](https://developers.google.com/books/terms)
  kapsamında sunulur; görüntüleyici yalnızca Google'ın gömülebilir (embeddable)
  olarak işaretlediği kitaplar için yüklenir ve ISBN olmadan gösterilmez.
- Bu sistem robot.txt ile izinli sayfalarla sınırlıdır; bu izinler tek başına
  Kullanım Koşullarını aşma hakkı vermez.
