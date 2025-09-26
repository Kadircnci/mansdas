import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function testNativeConnection() {
  console.log('🔍 MongoDB Native Driver Test');
  console.log('URI:', uri?.replace(/\/\/.*:.*@/, '//***:***@'));

  const client = new MongoClient(uri);

  try {
    console.log('⏳ Bağlantı kuruluyor...');
    
    // Connect with timeout
    await client.connect();
    
    console.log('✅ Bağlantı başarılı!');
    
    // Test database
    const db = client.db('social-media-planner');
    const collections = await db.listCollections().toArray();
    
    console.log('📊 Database:', db.databaseName);
    console.log('📁 Collections:', collections.length);
    
    // Test ping
    await db.admin().ping();
    console.log('🏓 Ping başarılı!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.log('💭 Muhtemel nedenler:');
    console.log('  1. IP whitelist güncel değil');
    console.log('  2. Database user şifresi yanlış');
    console.log('  3. Cluster offline');
  } finally {
    await client.close();
    console.log('🔐 Bağlantı kapatıldı');
  }
}

testNativeConnection();