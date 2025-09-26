# 🌟 Environment Variables Rehberi

## 📂 Dosya Yapısı

```
├── .env.example              # Genel template ve açıklamalar
├── .env.production.example   # Production deployment rehberi
├── .env.local               # Local development (Git'e commit edilmez)
└── .env.production          # Production values (Git'e commit edilmez)
```

## 🚀 Quick Start

### 1. Local Development İçin
```bash
# .env.example dosyasını kopyala
cp .env.example .env.local

# Gerekli değerleri düzenle
nano .env.local
```

### 2. Production Deploy İçin
```bash
# .env.production.example dosyasını Vercel Dashboard'da ayarla
# Vercel Dashboard > Settings > Environment Variables
```

## 🔑 Gerekli Environment Variables

### Development (Minimum)
- `MONGODB_URI` - MongoDB connection
- `SECRET_KEY` - JWT secret key
- `NEXT_PUBLIC_API_BASE` - API base URL

### Production (Minimum)
- `MONGODB_URI` - MongoDB Atlas connection
- `SECRET_KEY` - Güçlü production secret
- `NEXT_PUBLIC_API_BASE` - Production domain

## 🛠️ MongoDB Setup

### Local Development
```bash
# Docker ile MongoDB
docker run -d -p 27017:27017 --name mongodb mongo

# veya MongoDB Community Edition kur
# https://docs.mongodb.com/manual/installation/
```

### Production
1. MongoDB Atlas hesabı oluştur
2. Cluster oluştur
3. Connection string'i al
4. Vercel'de MONGODB_URI olarak ayarla

## 🔒 Security Notes

- ✅ `.env.local` Git'e commit edilmez
- ✅ Production secret'lar Vercel Dashboard'da
- ✅ Güçlü SECRET_KEY kullan (min 32 karakter)
- ❌ Asla production secret'ları kod içinde hardcode etme