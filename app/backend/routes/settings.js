const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Get all settings
router.get('/', settingsController.getAllSettings);

// Update a setting
router.post('/', settingsController.updateSetting);

module.exports = router;
