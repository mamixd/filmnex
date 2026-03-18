# 🚀 DEPLOY TALİMATLARI

## 1. GitHub'a Yükle

```bash
cd cinemax-platform
git init
git add .
git commit -m "initial commit"
# GitHub'da yeni repo oluştur, sonra:
git remote add origin https://github.com/KULLANICI_ADIN/cinemax.git
git push -u origin main
```

## 2. Render.com Deploy

### Seçenek A — Otomatik (render.yaml ile)
1. render.com → "New" → "Blueprint"
2. GitHub repoyu seç
3. render.yaml otomatik okunur, iki servis birden deploy olur

### Seçenek B — Manuel
**Backend:**
- render.com → New → Web Service
- GitHub repo → Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `node dist/main`
- Environment Variables: backend/.env dosyasındaki değerleri gir

**Frontend:**
- render.com → New → Web Service  
- GitHub repo → Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Environment Variables: frontend/.env.local dosyasındaki değerleri gir

## 3. Deploy Sonrası

Backend URL örn: https://cinemax-backend.onrender.com
Frontend URL örn: https://cinemax-frontend.onrender.com

Backend'de FRONTEND_URL'yi frontend URL ile güncelle.

## 4. İlk İçerik Yüklemesi

Admin kullanıcısı oluştur:
https://cinemax-backend.onrender.com/api/docs (Swagger UI)

POST /api/v1/auth/register
{
  "email": "admin@cinemax.com",
  "username": "admin",
  "password": "SifreniYaz123"
}

MongoDB Atlas'ta users koleksiyonunda bu kullanıcının role'ünü "admin" yap.

Sonra TMDB sync tetikle (Swagger'dan Bearer token ile):
POST /api/v1/movies/admin/sync/trending
POST /api/v1/movies/admin/sync/popular
POST /api/v1/series/admin/sync/trending

## 5. ⚠️ ÖNEMLİ

Bu .env dosyaları GERÇEk şifreler içeriyor.
Production'a geçmeden önce tüm şifreleri değiştir:
- MongoDB Atlas şifresi
- Upstash Redis şifresi  
- TMDB API Key
- JWT Secret
