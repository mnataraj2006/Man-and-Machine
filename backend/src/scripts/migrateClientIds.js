/* Run once during deployment: npm run migrate:client-ids */
const connectDB = require('../config/db');
const ClientProfile = require('../models/ClientProfile');
const ClientSequence = require('../models/ClientSequence');
const User = require('../models/User');

const VALID_CLIENT_ID_REGEX = /^MM\d{6,}$/;

(async () => {
  await connectDB();

  // 1. Ensure every CLIENT User has a ClientProfile
  const clientUsers = await User.find({ role: 'CLIENT' }).sort({ createdAt: 1, _id: 1 }).lean();
  for (const u of clientUsers) {
    const existing = await ClientProfile.findOne({ userId: u._id }).lean();
    if (!existing) {
      await ClientProfile.create({
        userId: u._id,
        branchId: u.branchId,
        name: u.name,
        phone: u.phone || '',
        email: u.email || '',
        joiningDate: u.createdAt || new Date(),
        registrationSource: 'SELF_REGISTERED',
        accountAccessStatus: u.status === 'ACTIVE' ? 'ACTIVE' : 'INVITATION_PENDING',
      });
    }
  }

  // 2. Find highest existing sequence number
  const allProfiles = await ClientProfile.find({}).sort({ createdAt: 1, _id: 1 }).lean();
  let maxSeq = 0;
  for (const p of allProfiles) {
    if (p.clientId && VALID_CLIENT_ID_REGEX.test(p.clientId)) {
      const num = parseInt(p.clientId.slice(2), 10);
      if (!Number.isNaN(num) && num > maxSeq) maxSeq = num;
    }
  }

  const seqDoc = await ClientSequence.findById('client').lean();
  if (seqDoc && seqDoc.sequence > maxSeq) {
    maxSeq = seqDoc.sequence;
  }

  // 3. Assign sequential IDs to profiles missing a valid clientId
  let assignedCount = 0;
  for (const p of allProfiles) {
    if (!p.clientId || !VALID_CLIENT_ID_REGEX.test(p.clientId)) {
      maxSeq += 1;
      const newClientId = `MM${String(maxSeq).padStart(6, '0')}`;
      await ClientProfile.collection.updateOne(
        { _id: p._id },
        { $set: { clientId: newClientId } }
      );
      assignedCount += 1;
    }
  }

  // 4. Sync ClientSequence counter
  await ClientSequence.findByIdAndUpdate(
    'client',
    { $max: { sequence: maxSeq } },
    { upsert: true, new: true }
  );

  // 5. Ensure unique index exists
  try {
    await ClientProfile.collection.createIndex(
      { clientId: 1 },
      { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
    );
  } catch (err) {
    console.warn('Index creation note:', err.message);
  }

  console.log(`Migration complete. Total profiles: ${allProfiles.length}, Assigned new IDs: ${assignedCount}, Current sequence: ${maxSeq}`);
  process.exit(0);
})().catch((err) => {
  console.error('Client ID migration failed:', err);
  process.exit(1);
});
