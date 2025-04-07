const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');

// Create a backup
router.post('/create', backupController.createBackup);

// Restore from backup
router.post('/restore', backupController.restoreBackup);

module.exports = router; 