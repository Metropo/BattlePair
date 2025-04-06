const express = require('express');
const router = express.Router();
const walkinController = require('../controllers/walkinController');

router.get('/', walkinController.getWalkins);
router.post('/', walkinController.createWalkin);
router.delete('/', walkinController.deleteWalkin);

module.exports = router;
