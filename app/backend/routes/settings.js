const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// GET: Persistente Einstellungen abrufen
router.get('/', settingsController.getSettings);

// POST: Persistente Einstellungen aktualisieren (z. B. passwortgeschützt)
router.post('/', settingsController.updateSettings);

module.exports = router;
