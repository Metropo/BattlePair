const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Verbinden mit der Datenbank (Game Modes):', err);
  } else {
    console.log('Mit SQLite-Datenbank verbunden (Game Modes)');
  }
});

// Erstelle die Tabelle "game_modes", falls sie noch nicht existiert
db.run(`
  CREATE TABLE IF NOT EXISTS game_modes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT
  )
`, (err) => {
  if (err) {
    console.error('Fehler beim Erstellen der Tabelle "game_modes":', err);
  }
});

// Alle Spielmodi abrufen
exports.getGameModes = (req, res) => {
  db.all(`SELECT * FROM game_modes`, [], (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Spielmodi:', err);
      res.status(500).json({ error: 'Fehler beim Abrufen der Spielmodi' });
    } else {
      res.json(rows);
    }
  });
};

// Neuen Spielmodus anlegen
exports.createGameMode = (req, res) => {
  const { name, description, icon } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }
  db.run(
    `INSERT INTO game_modes (name, description, icon) VALUES (?, ?, ?)`,
    [name, description || '', icon || ''],
    function(err) {
      if (err) {
        console.error('Fehler beim Anlegen des Spielmodus:', err);
        res.status(500).json({ error: 'Fehler beim Anlegen des Spielmodus' });
      } else {
        res.status(201).json({ message: 'Spielmodus angelegt', id: this.lastID });
      }
    }
  );
};

// Spielmodus löschen
exports.deleteGameMode = (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'ID ist erforderlich' });
  }
  db.run(`DELETE FROM game_modes WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error('Fehler beim Löschen des Spielmodus:', err);
      res.status(500).json({ error: 'Fehler beim Löschen des Spielmodus' });
    } else {
      res.json({ message: 'Spielmodus gelöscht' });
    }
  });
};
