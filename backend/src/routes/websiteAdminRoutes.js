const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const websiteController = require('../controllers/websiteController');
const { handleWebsiteMediaUpload } = require('../services/websiteMediaService');

// Strict defense-in-depth: all website CMS/Gallery mutations require ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

// Gym Gallery Management
router.get('/gallery', websiteController.getAdminGallery);
router.post('/gallery', handleWebsiteMediaUpload, websiteController.createGalleryMedia);
router.patch('/gallery/reorder', websiteController.reorderGalleryMedia);
router.put('/gallery/:id', handleWebsiteMediaUpload, websiteController.updateGalleryMedia);
router.patch('/gallery/:id/status', websiteController.toggleGalleryMediaStatus);
router.delete('/gallery/:id', websiteController.deleteGalleryMedia);

// Website Section Content Management
router.get('/content', websiteController.getAdminWebsiteContent);
router.put('/content/:section', handleWebsiteMediaUpload, websiteController.updateWebsiteContentSection);

module.exports = router;
