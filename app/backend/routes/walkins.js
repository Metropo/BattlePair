const express = require('express');
const router = express.Router();
const walkinController = require('../controllers/walkinController');

router.get('/', walkinController.getWalkins);
router.post('/', walkinController.createWalkin);
router.delete('/', walkinController.deleteWalkin);

// Reset match counter for a walk-in
router.post('/reset', walkinController.resetWalkinCounter);

module.exports = router;
