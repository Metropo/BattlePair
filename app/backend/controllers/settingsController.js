// /backend/controllers/settingsController.js

// Dieser Controller verwaltet persistente Einstellungen, die in einer SQLite-Datenbank gespeichert werden.
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Pfad zur SQLite-Datenbank
const dbPath = path.join(__dirname, '../database/database.sqlite');

// Datenbankverbindung herstellen
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Verbinden mit der Datenbank:', err);
  } else {
    console.log('Mit SQLite-Datenbank verbunden');
  }
});

// Sicherstellen, dass die Tabelle "settings" existiert
db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`, (err) => {
  if (err) {
    console.error('Fehler beim Erstellen der Settings-Tabelle:', err);
  }
});

exports.getSettings = (req, res) => {
  // Alle Einstellungen aus der Datenbank abrufen
  db.all(`SELECT key, value FROM settings`, [], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Fehler beim Abrufen der Einstellungen' });
    } else {
      const settings = {};
      rows.forEach(row => {
        settings[row.key] = row.value;
      });
      res.json(settings);
    }
  });
};

exports.updateSettings = (req, res) => {
  // Es wird ein Objekt mit key-value-Paaren erwartet
  const settings = req.body;
  const keys = Object.keys(settings);
  let pending = keys.length;
  let errorOccurred = false;
  
  // Für jedes key-value-Paar wird ein UPSERT (INSERT OR REPLACE) in die Datenbank durchgeführt
  keys.forEach(key => {
    const value = settings[key];
    db.run(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [key, value],
      function(err) {
        if (err) {
          errorOccurred = true;
          console.error(err);
        }
        pending--;
        if (pending === 0) {
          if (errorOccurred) {
            res.status(500).json({ error: 'Fehler beim Aktualisieren der Einstellungen' });
          } else {
            res.json({ message: 'Einstellungen aktualisiert' });
          }
        }
      }
    );
  });
};
