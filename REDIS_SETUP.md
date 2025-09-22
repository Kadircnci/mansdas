# Redis ve RQ Kurulum Talimatları

## Redis Kurulumu (macOS)

### 1. Homebrew ile Redis Kurulumu
```bash
# Homebrew ile Redis'i kurun
brew install redis

# Redis servisini başlatın
brew services start redis

# Alternatif: Manuel başlatma
redis-server
```

### 2. Redis'in Çalıştığını Kontrol Edin
```bash
# Redis CLI ile bağlantı test edin
redis-cli ping
# Yanıt: PONG
```

## Arka Plan İşleyici Sistemini Çalıştırma

### Terminal 1: Redis Server (Eğer servis olarak başlatmadıysanız)
```bash
redis-server
```

### Terminal 2: FastAPI Backend
```bash
cd backend
source .venv/bin/activate
bash run.sh
```

### Terminal 3: RQ Worker (Gönderi yayınlama işlerini yapar)
```bash
cd backend
source .venv/bin/activate
python app/worker.py
```

### Terminal 4: RQ Scheduler (Zamanlanmış işleri yönetir)
```bash
cd backend
source .venv/bin/activate
python app/scheduler.py
```

## Sistem Nasıl Çalışır?

### 1. Gönderi Durumları
- **taslak**: Henüz planlanmamış gönderi
- **planli**: Belirli bir zamanda yayınlanmak üzere planlanmış
- **kuyruk**: İşleme kuyruğuna alınmış (yayınlanmak üzere)
- **yayinlandi**: Başarıyla yayınlanmış
- **basarisiz**: Maksimum deneme sayısından sonra başarısız

### 2. API Endpoint'leri

#### Gönderi Oluşturma/Güncelleme
- `POST /posts/` - Yeni gönderi (scheduled_at ile otomatik planlama)
- `PUT /posts/{id}` - Güncelleme (scheduled_at değişirse yeniden planlama)

#### Manuel İşlemler
- `POST /posts/{id}/enqueue` - Hemen yayınla (zamanlamayı geç)
- `POST /posts/{id}/cancel` - Planlanmış yayını iptal et
- `POST /posts/{id}/schedule` - Yayın zamanı belirle

### 3. Retry Mekanizması
- Başarısız işler otomatik olarak yeniden denenir
- Exponential backoff: 2^retry_count dakika
- Maksimum 3 deneme
- Hata mesajları `last_error` alanında saklanır

### 4. Test Etme

#### Dashboard'da Gönderi Oluşturun
1. `http://localhost:3000/dashboard` adresine gidin
2. Gelecek bir tarih/saat belirleyerek gönderi oluşturun
3. Status'un "planli" olduğunu kontrol edin

#### RQ Dashboard (Opsiyonel)
```bash
# RQ Dashboard kurulumu
pip install rq-dashboard

# Dashboard başlatma
rq-dashboard --redis-host localhost --redis-port 6379 --redis-db 0
# http://localhost:9181 adresinde açılır
```

## Sorun Giderme

### Redis Bağlantı Hatası
```bash
# Redis çalışıyor mu kontrol edin
brew services list | grep redis

# Redis'i yeniden başlatın
brew services restart redis
```

### Port Çakışması
- Redis varsayılan port: 6379
- FastAPI: 8081
- Frontend: 3000
- RQ Dashboard: 9181

### Log Kontrolleri
- Worker ve Scheduler konsollarında detaylı loglar görüntülenir
- Hata durumlarında `last_error` alanını kontrol edin

## Üretim Ortamı İçin Notlar

1. **Redis Güvenliği**: Redis'i sadece localhost'ta açık tutun veya şifre ekleyin
2. **Supervisor/systemd**: Worker ve scheduler'ı servis olarak çalıştırın
3. **Monitoring**: RQ Dashboard veya Prometheus metrikleri ekleyin
4. **Backup**: Redis verilerini yedekleyin
5. **Scaling**: Birden fazla worker çalıştırabilirsiniz

