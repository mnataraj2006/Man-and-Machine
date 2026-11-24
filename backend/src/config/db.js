const mongoose = require('mongoose');
const path = require('path');

// Ensure environment variables from backend/.env are loaded regardless of current working directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Connect to MongoDB safely.
 * Never logs credentials or full connection strings.
 */
const connectDB = async () => {
  let uri = process.env.MONGODB_URI;

  const isPlaceholder = !uri || uri.includes('PASTE_THE_MONGODB_ATLAS_CONNECTION_STRING_HERE');

  // Fallback to local MongoDB if placeholder is present or uri is undefined
  if (isPlaceholder) {
    uri = 'mongodb://127.0.0.1:27017/man_and_machine';
  }

  // Determine if connecting to Cloud (Atlas) or Local
  const isAtlas = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');
  const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');

  try {
    // Explicitly enforce database name 'man_and_machine' so Atlas doesn't dump data into 'test'
    const conn = await mongoose.connect(uri, {
      dbName: 'man_and_machine',
      tlsAllowInvalidCertificates: true, // Prevents cluster creation clock skew (certificate NotBefore)
      serverSelectionTimeoutMS: 10000,
    });

    if (isAtlas) {
      console.log(`✅ MongoDB Atlas connected successfully! (Host: ${conn.connection.host}, Database: "${conn.connection.name}")`);
    } else if (isLocal) {
      console.log(`ℹ️ Connected to LOCAL MongoDB at ${conn.connection.host}:${conn.connection.port} (Database: "${conn.connection.name}")`);
      console.warn('⚠️ NOTICE: Backend is storing data in LOCAL MongoDB (127.0.0.1:27017/man_and_machine).');
      console.warn('👉 To see data in MongoDB Atlas cloud, set MONGODB_URI in backend/.env with your MongoDB Atlas cluster connection string.');
    } else {
      console.log(`MongoDB connected successfully to ${conn.connection.host} (Database: "${conn.connection.name}")`);
    }

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;
