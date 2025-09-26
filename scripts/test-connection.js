import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔧 MongoDB Connection Test');
console.log('URI:', MONGODB_URI?.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials

async function testConnection() {
  try {
    console.log('⏳ Bağlantı test ediliyor...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB Atlas bağlantısı başarılı!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    console.log('🌐 Cluster:', mongoose.connection.host);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Mevcut collections:', collections.length);
    
  } catch (error) {
    console.error('❌ Bağlantı hatası:', error.message);
    
    if (error.message.includes('IP')) {
      console.log('💡 Çözüm: MongoDB Atlas dashboard\'ta IP whitelist kontrol et');
    }
    
  } finally {
    await mongoose.disconnect();
    console.log('🔐 Bağlantı kapatıldı');
    process.exit(0);
  }
}

testConnection();