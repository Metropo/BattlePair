const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

// Get an image
router.get('/:name', imageController.getImage);

// Upload or update an image
router.post('/:name', imageController.uploadImage);

// Delete an image
router.delete('/:name', imageController.deleteImage);

module.exports = router; 