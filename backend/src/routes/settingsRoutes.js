const express = require('express');
const router = express.Router();
const { getUserSettings, updateUserSettings } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getUserSettings);
router.put('/', updateUserSettings);

module.exports = router;
