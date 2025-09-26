import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// TypeScript global declaration
declare global {
  var mongoose: any;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000, // 10 seconds
      maxPoolSize: NODE_ENV === 'production' ? 10 : 5, // Maintain up to 10 socket connections in production
      minPoolSize: NODE_ENV === 'production' ? 5 : 2, // Maintain a minimum of 5 socket connections in production
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      console.log('🚀 MongoDB connected successfully');
      if (NODE_ENV === 'development') {
        console.log(`📊 Connected to database: ${mongoose.connection.db?.databaseName || 'unknown'}`);
        console.log(`🌐 MongoDB host: ${mongoose.connection.host}`);
      }
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed:', e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;