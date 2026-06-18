import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('Please define MONGODB_URI in .env.local');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export default async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // MongoDB Atlas Stable API (Cluster0) — matches the v1 Server API config.
      // `strict` is intentionally left at its default (false) because Mongoose
      // issues some commands (e.g. createIndexes/count) outside Stable API v1.
      serverApi: {
        version: '1',
        deprecationErrors: true,
      },
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}
