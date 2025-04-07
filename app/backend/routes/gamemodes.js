const express = require('express');
const router = express.Router();
const gameModeController = require('../controllers/gameModeController');

// GET: Alle Spielmodi abrufen
router.get('/', gameModeController.getGameModes);

// POST: Neuen Spielmodus anlegen
router.post('/', gameModeController.createGameMode);

// DELETE: Einen Spielmodus löschen
router.delete('/', gameModeController.deleteGameMode);

module.exports = router;
