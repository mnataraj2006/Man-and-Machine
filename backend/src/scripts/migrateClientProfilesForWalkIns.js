/* Run once during deployment: npm run migrate:walk-in-clients */
const connectDB = require('../config/db');
const ClientProfile = require('../models/ClientProfile');

(async () => {
  await connectDB();
  try { await ClientProfile.collection.dropIndex('userId_1'); } catch (error) { if (error.codeName !== 'IndexNotFound') throw error; }
  await ClientProfile.collection.createIndex({ userId: 1 }, { unique: true, sparse: true });
  console.log('ClientProfile userId index now supports profile-only walk-ins.');
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
