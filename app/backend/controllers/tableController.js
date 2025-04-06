const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Datenbankverbindung fehlgeschlagen:', err);
  } else {
    console.log('Mit SQLite-Datenbank verbunden (Tables)');
  }
});

// Erstelle Tabelle "tables", falls sie noch nicht existiert
db.run(`
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    temp_name TEXT,
    player_count INTEGER DEFAULT 0
  )
`, (err) => {
  if (err) {
    console.error('Fehler beim Erstellen der Tabelle "tables":', err);
  }
});

exports.getTables = (req, res) => {
  db.all(`SELECT * FROM tables`, [], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Fehler beim Abrufen der Tische' });
    } else {
      res.json(rows);
    }
  });
};

exports.createTable = (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }
  db.run(`INSERT INTO tables (name) VALUES (?)`, [name], function(err) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Fehler beim Erstellen des Tisches' });
    } else {
      res.status(201).json({ message: 'Tisch erstellt', id: this.lastID });
    }
  });
};

exports.updateTable = (req, res) => {
  const { id, name, temp_name, player_count } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'ID ist erforderlich' });
  }
  db.run(
    `UPDATE tables SET name = ?, temp_name = ?, player_count = ? WHERE id = ?`,
    [name, temp_name || '', player_count || 0, id],
    function(err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Tisches' });
      } else {
        res.json({ message: 'Tisch aktualisiert' });
      }
    }
  );
};

exports.deleteTable = (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'ID ist erforderlich' });
  }
  db.run(`DELETE FROM tables WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Fehler beim Löschen des Tisches' });
    } else {
      res.json({ message: 'Tisch gelöscht' });
    }
  });
};
