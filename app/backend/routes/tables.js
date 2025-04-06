const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');

// GET: Alle Tischkonfigurationen abrufen
router.get('/', tableController.getTables);

// POST: Einen neuen Tisch erstellen
router.post('/', tableController.createTable);

// PUT: Einen Tisch aktualisieren
router.put('/', tableController.updateTable);

// DELETE: Einen Tisch löschen
router.delete('/', tableController.deleteTable);

module.exports = router;
