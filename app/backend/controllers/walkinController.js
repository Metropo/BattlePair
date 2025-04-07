const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler bei DB-Verbindung:', err);
  } else {
    console.log('Mit SQLite-Datenbank verbunden (Walkins)');
  }
});

// Erstelle Tabelle "walkins", falls sie noch nicht existiert
db.run(`
  CREATE TABLE IF NOT EXISTS walkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    round_start INTEGER DEFAULT 0
  )
`, (err) => {
  if (err) console.error('Fehler beim Erstellen der Walkins-Tabelle:', err);
});

exports.getWalkins = (req, res) => {
  db.all(`SELECT * FROM walkins`, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Laufkundschaft' });
    }
    res.json(rows);
  });
};

exports.createWalkin = (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  db.run(`INSERT INTO walkins (name) VALUES (?)`, [name], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Hinzufügen der Laufkundschaft' });
    }
    res.status(201).json({ message: 'Laufkundschaft hinzugefügt', id: this.lastID });
  });
};

exports.deleteWalkin = (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID ist erforderlich' });
  db.run(`DELETE FROM walkins WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Löschen der Laufkundschaft' });
    }
    res.json({ message: 'Laufkundschaft gelöscht' });
  });
};

// Reset match counter for a walk-in
exports.resetWalkinCounter = (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'ID ist erforderlich' });
  }

  // Get the current max match ID of started matches
  db.get('SELECT MAX(id) as max_id FROM matches WHERE is_started = 1', [], (err, row) => {
    if (err) {
      console.error('Fehler beim Abrufen der maximalen Match-ID:', err);
      return res.status(500).json({ error: 'Fehler beim Abrufen der maximalen Match-ID' });
    }

    const roundStart = (row.max_id || 0) + 1;

    // Update the walk-in's round_start value
    db.run('UPDATE walkins SET round_start = ? WHERE id = ?', [roundStart, id], function(err) {
      if (err) {
        console.error('Fehler beim Zurücksetzen des Match-Zählers:', err);
        return res.status(500).json({ error: 'Fehler beim Zurücksetzen des Match-Zählers' });
      }
      res.json({ success: true, round_start: roundStart });
    });
  });
};
