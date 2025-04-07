const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Middleware für JSON-Parsing und statische Dateien
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// API-Routen
app.use('/api/matches', require('./routes/matches'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/walkins', require('./routes/walkins'));
app.use('/api/gamemodes', require('./routes/gamemodes'));


// Start des Servers
app.listen(port, () => {
  console.log(`Server läuft unter http://localhost:${port}`);
});
