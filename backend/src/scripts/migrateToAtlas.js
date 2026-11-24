const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

/**
 * Migration Utility: Copy local MongoDB data to MongoDB Atlas.
 *
 * Reads:
 * - Source: LOCAL_MONGODB_URI or default mongodb://127.0.0.1:27017/man_and_machine
 * - Destination: MONGODB_URI in backend/.env
 *
 * Usage:
 *   npm run migrate:atlas
 *   node src/scripts/migrateToAtlas.js
 */
const migrateToAtlas = async () => {
  const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/man_and_machine';
  const targetUri = process.env.MONGODB_URI;

  console.log('====================================================');
  console.log('🏋️ MAN & MACHINE — LOCAL TO ATLAS MIGRATION UTILITY');
  console.log('====================================================');

  if (!targetUri || targetUri.includes('PASTE_THE_MONGODB_ATLAS_CONNECTION_STRING_HERE') || targetUri.includes('127.0.0.1') || targetUri.includes('localhost')) {
    console.error('\n❌ ERROR: Target MONGODB_URI is not set to a MongoDB Atlas cluster.');
    console.error('👉 Step 1: Open backend/.env');
    console.error('👉 Step 2: Set MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/man_and_machine?retryWrites=true&w=majority');
    console.error('👉 Step 3: Run npm run migrate:atlas again\n');
    process.exit(1);
  }

  console.log('\n[1/4] Connecting to Local MongoDB source database...');
  let sourceConn;
  try {
    sourceConn = await mongoose.createConnection(localUri, {
      dbName: 'man_and_machine',
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    console.log(`✓ Connected to Local Source: 127.0.0.1:27017 (db: "${sourceConn.name}")`);
  } catch (err) {
    console.error('❌ Failed to connect to local MongoDB at 127.0.0.1:27017:', err.message);
    process.exit(1);
  }

  console.log('\n[2/4] Connecting to MongoDB Atlas destination cluster...');
  let targetConn;
  try {
    targetConn = await mongoose.createConnection(targetUri, {
      dbName: 'man_and_machine',
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 10000,
    }).asPromise();
    console.log(`✓ Connected to Atlas Destination: ${targetConn.host} (db: "${targetConn.name}")`);
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB Atlas:', err.message);
    console.error('👉 Check your IP whitelist in MongoDB Atlas (Network Access -> Allow 0.0.0.0/0 or current IP).');
    await sourceConn.close();
    process.exit(1);
  }

  console.log('\n[3/4] Migrating collections to MongoDB Atlas...');
  try {
    const collections = await sourceConn.db.listCollections().toArray();
    const sortedCollections = collections
      .map(c => c.name)
      .filter(name => !name.startsWith('system.') && !name.startsWith('__'))
      .sort();

    console.log(`Found ${sortedCollections.length} collections to migrate.\n`);

    let totalDocsMigrated = 0;

    for (const colName of sortedCollections) {
      const srcCol = sourceConn.db.collection(colName);
      const destCol = targetConn.db.collection(colName);

      const docs = await srcCol.find({}).toArray();
      if (docs.length === 0) {
        console.log(`  • ${colName.padEnd(24)}: 0 documents (skipped)`);
        continue;
      }

      // Upsert documents by _id so migration is idempotent and can be run multiple times safely
      const bulkOps = docs.map(doc => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));

      await destCol.bulkWrite(bulkOps, { ordered: false });
      totalDocsMigrated += docs.length;
      console.log(`  ✓ ${colName.padEnd(24)}: ${docs.length.toString().padStart(3)} documents migrated`);
    }

    console.log('\n[4/4] Verification...');
    const atlasCollections = await targetConn.db.listCollections().toArray();
    console.log(`✓ Atlas database "man_and_machine" now has ${atlasCollections.length} collections.`);
    console.log(`✓ Successfully migrated ${totalDocsMigrated} total documents to MongoDB Atlas!`);
    console.log('\n🎉 ALL LOCAL DATA IS NOW SYNCHRONIZED TO MONGODB ATLAS!');
  } catch (err) {
    console.error('\n❌ Migration error:', err.message);
  } finally {
    await sourceConn.close();
    await targetConn.close();
    console.log('\nClosed database connections.');
  }
};

if (require.main === module) {
  migrateToAtlas()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateToAtlas;
