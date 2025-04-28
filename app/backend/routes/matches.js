const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

// GET: Alle Matches abrufen
router.get('/', matchController.getMatches);

// GET: Startzeit des letzten Matches abrufen
router.get('/last-start-time', matchController.getLastMatchStartTime);

// GET: Match-Statistiken für einen Teilnehmer
router.get('/stats/:participantType/:participantId', matchController.getParticipantMatchStats);

// POST: Neues Match anlegen
router.post('/', matchController.createMatch);

// PUT: Match aktualisieren
router.put('/update', matchController.updateMatch);

// PUT: Match starten
router.put('/start', matchController.startMatch);

// PUT: Match zurücksetzen
router.put('/unstart', matchController.unstartMatch);

// DELETE: Match löschen
router.delete('/', matchController.deleteMatch);

// DELETE: Alle Matches löschen
router.delete('/all', matchController.deleteAllMatches);

module.exports = router;


