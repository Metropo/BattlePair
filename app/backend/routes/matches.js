const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.get('/', matchController.getMatches);
router.post('/', matchController.createMatch);
router.put('/update', matchController.updateMatch);
router.put('/start', matchController.startMatch);
router.delete('/', matchController.deleteMatch);

module.exports = router;
