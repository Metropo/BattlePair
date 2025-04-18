const express = require('express');
const router = express.Router();
const packageJson = require('../../package.json');

router.get('/', (req, res) => {
    res.json({
        version: packageJson.version,
        name: packageJson.name,
        author: packageJson.author,
        homepage: packageJson.homepage || null
    });
});

module.exports = router; 