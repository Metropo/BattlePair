// /backend/controllers/matchController.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Datenbankverbindung fehlgeschlagen:', err);
  } else {
    console.log('Mit SQLite-Datenbank verbunden (Matches)');
  }
});

// Tabelle "matches" erstellen, falls sie noch nicht existiert
db.run(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participants TEXT,  -- JSON-Array der Teilnehmer (Tische und Walkins)
    is_started INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Fehler beim Erstellen der Tabelle "matches":', err);
  }
});

// Alle Matches abrufen; Teilnehmer werden aus dem JSON-Text geparst
exports.getMatches = (req, res) => {
  db.all(`SELECT * FROM matches ORDER BY created_at ASC`, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Matches' });
    }
    const matches = rows.map(row => ({
      id: row.id,
      participants: row.participants ? JSON.parse(row.participants) : [],
      is_started: row.is_started,
      created_at: row.created_at
    }));
    res.json(matches);
  });
};

// Ein neues Match anlegen (hier typischerweise mit einem leeren Teilnehmer-Array)
exports.createMatch = (req, res) => {
  const { participants } = req.body;
  if (!participants || !Array.isArray(participants)) {
    return res.status(400).json({ error: 'Teilnehmer müssen als Array übergeben werden' });
  }
  const participantsJson = JSON.stringify(participants);
  db.run(`INSERT INTO matches (participants) VALUES (?)`, [participantsJson], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Anlegen des Matches' });
    }
    res.status(201).json({ message: 'Match angelegt', id: this.lastID });
  });
};

// Ein bestehendes Match aktualisieren (z. B. Teilnehmer hinzufügen oder entfernen)
exports.updateMatch = (req, res) => {
  const { id, participants } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Match-ID ist erforderlich' });
  }
  if (!participants || !Array.isArray(participants)) {
    return res.status(400).json({ error: 'Teilnehmer müssen als Array übergeben werden' });
  }
  const participantsJson = JSON.stringify(participants);
  db.run(`UPDATE matches SET participants = ? WHERE id = ?`, [participantsJson, id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Aktualisieren des Matches' });
    }
    res.json({ message: 'Match aktualisiert' });
  });
};

// Ein Match als gestartet markieren
exports.startMatch = (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Match-ID ist erforderlich' });
  }
  db.run(`UPDATE matches SET is_started = 1 WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Starten des Matches' });
    }
    res.json({ message: 'Match gestartet' });
  });
};

// Ein Match löschen
exports.deleteMatch = (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Match-ID ist erforderlich' });
  }
  db.run(`DELETE FROM matches WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Löschen des Matches' });
    }
    res.json({ message: 'Match gelöscht' });
  });
};
