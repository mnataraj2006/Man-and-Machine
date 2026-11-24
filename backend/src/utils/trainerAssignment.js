const User = require('../models/User');

/**
 * Validates whether a client has a valid, active trainer assigned.
 * Rules:
 * 1. ClientProfile must have a non-null trainerId.
 * 2. The referenced User must exist in MongoDB.
 * 3. The User's role must be 'TRAINER'.
 * 4. The User's status must be 'ACTIVE'.
 * 
 * If any condition fails -> { trainerAssigned: false, trainer: null }
 * If all conditions pass -> { trainerAssigned: true, trainer: {...} }
 */
const resolveClientTrainer = async (clientProfile) => {
  if (!clientProfile || !clientProfile.trainerId) {
    return { trainerAssigned: false, trainer: null };
  }

  const rawTrainerId = clientProfile.trainerId._id || clientProfile.trainerId;

  try {
    const trainer = await User.findOne({
      _id: rawTrainerId,
      role: 'TRAINER',
      status: 'ACTIVE',
    }).select('name email phone branchId');

    if (!trainer) {
      return { trainerAssigned: false, trainer: null };
    }

    return {
      trainerAssigned: true,
      trainer: {
        id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        branchId: trainer.branchId,
      },
    };
  } catch (err) {
    return { trainerAssigned: false, trainer: null };
  }
};

module.exports = {
  resolveClientTrainer,
};
