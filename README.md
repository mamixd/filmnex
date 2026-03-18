# 🎬 CineMax — Enterprise Film/Dizi Platformu

Tam otomatik, production-level, ölçeklenebilir film ve dizi izleme platformu.

---

## 📁 Proje Klasör Yapısı

```
cinemax-platform/
├── backend/                          # NestJS API
│   ├── src/
│   │   ├── app.module.ts             # Ana modül (tüm DI wiring)
│   │   ├── main.ts                   # Bootstrap, Swagger, CORS
│   │   ├── config/
│   │   │   ├── app.config.ts         # PORT, JWT, CORS ayarları
│   │   │   ├── database.config.ts    # MongoDB bağlantısı
│   │   │   └── tmdb.config.ts        # TMDB API ayarları
│   │   ├── database/
│   │   │   └── schemas/
│   │   │       ├── movie.schema.ts   # Film MongoDB şeması + indexler
│   │   │       ├── series.schema.ts  # Dizi/Bölüm/VideoSource/User şemaları
│   │   │       └── ...
│   │   ├── modules/
│   │   │   ├── movies/
│   │   │   │   ├── movies.module.ts
│   │   │   │   ├── movies.controller.ts  # REST endpoints
│   │   │   │   ├── movies.service.ts     # İş mantığı + TMDB sync
│   │   │   │   └── tmdb.service.ts       # TMDB API istemcisi
│   │   │   ├── series/
│   │   │   │   ├── series.module.ts
│   │   │   │   ├── series.controller.ts
│   │   │   │   └── series.service.ts
│   │   │   ├── video/
│   │   │   │   ├── video.module.ts
│   │   │   │   ├── video.controller.ts   # /video/:type/:id/sources
│   │   │   │   └── video.service.ts      # Kaynak yönetimi + fallback
│   │   │   ├── auth/
│   │   │   │   └── auth.service.ts       # JWT login/register
│   │   │   ├── users/
│   │   │   │   └── users.service.ts      # Favoriler, geçmiş
│   │   │   ├── admin/
│   │   │   │   └── admin.service.ts      # Dashboard, sync tetikleme
│   │   │   └── seo/
│   │   │       └── seo.controller.ts     # Sitemap, robots.txt, health
│   │   ├── queue/
│   │   │   ├── queue.module.ts           # BullMQ modül tanımları
│   │   │   ├── cron-jobs.service.ts      # Zamanlanmış görevler
│   │   │   └── processors/
│   │   │       ├── content-sync.processor.ts  # İçerik senkronizasyon worker
│   │   │       └── video-check.processor.ts   # Video sağlık kontrol worker
│   │   └── common/
│   │       ├── guards/
│   │       │   ├── jwt-auth.guard.ts
│   │       │   └── roles.guard.ts
│   │       ├── decorators/
│   │       │   ├── roles.decorator.ts
│   │       │   └── public.decorator.ts
│   │       ├── interceptors/
│   │       │   └── transform.interceptor.ts  # { success, data, timestamp }
│   │       └── filters/
│   │           └── http-exception.filter.ts
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                         # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Ana sayfa (trending, featured)
│   │   │   ├── film/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx      # Film detay (SSR + SEO)
│   │   │   │       └── izle/
│   │   │   │           └── page.tsx  # Video player sayfası
│   │   │   ├── dizi/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │   ├── filmler/
│   │   │   │   └── page.tsx          # Film listesi
│   │   │   └── diziler/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── player/
│   │   │   │   └── VideoPlayer.tsx   # video.js wrapper (HLS, fallback, subtitles)
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── cards/
│   │   │   │   ├── MovieCard.tsx
│   │   │   │   └── SeriesCard.tsx
│   │   │   └── ui/
│   │   │       └── ...
│   │   └── lib/
│   │       ├── api.ts                # Axios istemcisi + tüm API fonksiyonları
│   │       └── hooks/
│   │           ├── useAuth.ts        # Zustand auth store
│   │           ├── useWatchProgress.ts
│   │           └── useMovies.ts      # SWR hooks
│   ├── next.config.js
│   └── package.json
│
└── docker/
    ├── docker-compose.yml            # Backend + Frontend + MongoDB + Redis + Nginx
    └── nginx.conf                    # Reverse proxy + SSL + rate limiting
```

---

## 🏗️ Sistem Mimarisi

```
[Kullanıcı Tarayıcı]
        │
        ▼
  [Nginx Reverse Proxy]  ──── SSL Termination, Rate Limiting
        │
   ┌────┴────┐
   │         │
   ▼         ▼
[Next.js]  [NestJS API]
(SSR/SEO)  (REST + Auth)
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
[MongoDB]   [Redis]   [BullMQ]
(İçerik)   (Cache)   (Queue)
               │
               ▼
         [TMDB API]
         (Otomatik Sync)

[Video CDN] ──── HLS/m3u8 ────► [Video.js Player]
```

---

## ⚡ Otomatik İçerik Pipeline'ı

```
Cron Job (her gün 06:00)
        │
        ▼
BullMQ Queue
        │
        ▼
ContentSyncProcessor
        │
   ┌────┴──────────────┐
   ▼                   ▼
TMDB Trending      TMDB Popular
Movies/Series      Movies/Series
        │
        ▼
Duplicate Check (tmdbId unique)
        │
   ┌────┴────┐
   │         │
Mevcut     Yeni İçerik
Güncelle   DB'ye Ekle
               │
               ▼
         VideoCheck Queue
         (sağlık kontrolü)
               │
               ▼
         isHealthy = true/false
         failCount >= 5 → devre dışı
```

---

## 🎬 3 Katmanlı Video Sistemi

```
Kullanıcı video izlemeye başlar
         │
         ▼
  VideoService.getVideoSources()
         │
  Aktif + Sağlıklı kaynaklar
  priority sırası ile döner
         │
    ┌────┴──────────────┐
    │                   │
PRIMARY              FALLBACK
HLS (m3u8)          MP4 / Embed
CDN tabanlı         Alternatif kaynak
    │
    ▼
video.js player
    │
    ├── HLS adaptive bitrate (1080p/720p/480p)
    ├── Otomatik kaynak switching (hata → sonraki)
    ├── Altyazı (.vtt) desteği
    ├── Kalite seçici overlay
    └── İzleme süresi takibi
```

---

## 🔄 Cron Job Takvimi

| Job | Zaman | Açıklama |
|-----|-------|----------|
| `sync-trending-movies` | Her gün 06:00 | TMDB trending filmler |
| `sync-trending-series` | Her gün 06:00 | TMDB trending diziler |
| `sync-popular-movies` | Her 6 saatte | Popüler filmler (3 sayfa) |
| `sync-popular-series` | Her 6 saatte | Popüler diziler |
| `sync-now-playing` | Her gün 08:00 | Gösterimde olan filmler |
| `check-all-sources` | Her 4 saatte | Video URL sağlık kontrolü |
| `refresh-homepage` | Her 30 dakika | Ana sayfa cache yenileme |

---

## 🗄️ MongoDB Collections & Indexler

### movies
```
{ tmdbId: 1 }           unique
{ slug: 1 }             unique
{ createdAt: -1 }
{ popularity: -1 }
{ voteAverage: -1 }
{ isTrending: 1 }
{ genres: 1 }
{ title: "text", overview: "text" }   full-text search
```

### series
```
{ tmdbId: 1 }           unique
{ slug: 1 }             unique
{ popularity: -1 }
{ name: "text", overview: "text" }
```

### videoSources
```
{ contentId: 1, contentType: 1 }
{ isActive: 1, isHealthy: 1 }
```

### users
```
{ email: 1 }            unique
```

---

## 🔌 API Endpoints

### Public (Auth gerektirmez)
```
GET  /api/v1/movies                    Film listesi (page, limit, genre, sort, search)
GET  /api/v1/movies/trending           Trending filmler
GET  /api/v1/movies/featured           Öne çıkan filmler
GET  /api/v1/movies/:slug              Film detayı
GET  /api/v1/series                    Dizi listesi
GET  /api/v1/series/trending           Trending diziler
GET  /api/v1/series/:slug              Dizi detayı
GET  /api/v1/video/:type/:id/sources   Video kaynakları
GET  /api/v1/sitemap                   XML sitemap
GET  /api/v1/health                    Sağlık kontrolü
```

### Auth
```
POST /api/v1/auth/register             Kayıt
POST /api/v1/auth/login                Giriş
GET  /api/v1/auth/me                   Profil bilgisi
```

### Kullanıcı (JWT gerekli)
```
POST   /api/v1/users/favorites         Favoriye ekle
DELETE /api/v1/users/favorites/:id     Favoriden çıkar
GET    /api/v1/users/favorites         Favori listesi
POST   /api/v1/users/watch-history     İzleme kaydı
GET    /api/v1/users/watch-history     İzleme geçmişi
PUT    /api/v1/users/profile           Profil güncelle
```

### Admin (JWT + admin rolü)
```
GET  /api/v1/admin/dashboard           Genel istatistikler
GET  /api/v1/admin/queue/status        Queue durumu
POST /api/v1/admin/sync/:type          Manuel sync tetikle
POST /api/v1/admin/cache/flush         Cache temizle
GET  /api/v1/admin/video-sources/unhealthy  Sorunlu kaynaklar
PUT  /api/v1/admin/movies/:id/publish  Film yayın durumu
POST /api/v1/video/sources             Video kaynağı ekle
DEL  /api/v1/video/sources/:id         Video kaynağı sil
```

---

## 🚀 Kurulum

### 1. Gereksinimler
- Node.js 20+
- Docker & Docker Compose
- MongoDB (Docker veya cloud)
- Redis (Docker veya cloud)
- TMDB API Key (ücretsiz: themoviedb.org)

### 2. Ortam Değişkenleri
```bash
cp .env.example .env
# .env dosyasını düzenle
# En az TMDB_API_KEY ve JWT_SECRET doldurulmalı
```

### 3. Docker ile Başlat (Production)
```bash
cd docker
docker compose up -d
```

### 4. Manuel Geliştirme
```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

### 5. İlk İçerik Yüklemesi
Admin kullanıcısı oluşturup şu endpoint'leri çağır:
```bash
POST /api/v1/auth/register
# email, username, password (sonra DB'den role: "admin" yap)

POST /api/v1/admin/sync/trending-movies
POST /api/v1/admin/sync/popular-movies
POST /api/v1/admin/sync/trending-series
```

---

## 🎥 Video Kaynağı Ekleme (Admin)

```bash
curl -X POST /api/v1/video/sources \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "MOVIE_MONGODB_ID",
    "contentType": "movie",
    "url": "https://cdn.example.com/film-adi/master.m3u8",
    "type": "hls",
    "quality": "auto",
    "priority": 1,
    "subtitles": [
      {
        "lang": "tr",
        "label": "Türkçe",
        "url": "https://cdn.example.com/film-adi/tr.vtt"
      }
    ]
  }'
```

---

## 📊 Redis Cache Stratejisi

| Cache Key | TTL | İçerik |
|-----------|-----|--------|
| `movies:trending` | 30 dk | Trending film listesi |
| `movies:list:*` | 5 dk | Sayfalı film listesi |
| `movie:SLUG` | 10 dk | Film detay |
| `series:trending` | 30 dk | Trending dizi listesi |

---

## 🔧 Genişletme Notları

### Yeni İçerik Kaynağı Eklemek
1. `TmdbService`'e yeni metod ekle
2. `CronJobsService`'e yeni cron job ekle
3. `ContentSyncProcessor`'a case ekle

### Yeni Video Tipi Eklemek
1. `VideoSourceType` enum'una ekle
2. `VideoService.getMimeType()` metodunu güncelle
3. `VideoPlayer.tsx`'e MIME type mapping ekle

### Ölçeklendirme
- BullMQ: `concurrency` değerini artır
- MongoDB: Atlas ile sharding
- Redis: Cluster modu
- Nginx: upstream'e backend replika ekle
