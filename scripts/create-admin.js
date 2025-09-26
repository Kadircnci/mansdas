import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI bulunamadı. .env.local dosyasını kontrol edin.');
  process.exit(1);
}

// User schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    console.log('MongoDB Atlas\'a bağlanıyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin kullanıcısı zaten mevcut');
      console.log('📝 Kullanıcı adı: admin');
      console.log('📝 Şifre: admin123');
      return;
    }

    // Create admin user
    const password = 'admin123';
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const adminUser = new User({
      username: 'admin',
      password_hash,
      role: 'admin'
    });

    await adminUser.save();
    console.log('🎉 Admin kullanıcısı başarıyla oluşturuldu!');
    console.log('📝 Kullanıcı adı: admin');
    console.log('📝 Şifre: admin123');
    console.log('🔐 Giriş için: http://localhost:3000/giris');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔐 MongoDB bağlantısı kapatıldı');
  }
}

// Run the script
createAdminUser();