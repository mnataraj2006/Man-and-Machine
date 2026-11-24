const mongoose = require('mongoose');

/**
 * Connect to MongoDB safely.
 * Never logs credentials or full connection strings.
 */
const connectDB = async () => {
  let uri = process.env.MONGODB_URI;

  // Fallback to local MongoDB if placeholder is present or uri is undefined
  if (!uri || uri.includes('PASTE_THE_MONGODB_ATLAS_CONNECTION_STRING_HERE')) {
    uri = 'mongodb://127.0.0.1:27017/man_and_machine';
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
    return conn;
  } catch (error) {
    console.error('MongoDB connection failed');
    throw error;
  }
};

module.exports = connectDB;
