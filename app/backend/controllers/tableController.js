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
    player_count INTEGER DEFAULT 0,
    round_start INTEGER DEFAULT 0
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

  // Build the update query dynamically based on provided fields
  const updates = [];
  const params = [];

  if (name !== undefined && name !== null) {
    updates.push('name = ?');
    params.push(name);
  }

  if (temp_name !== undefined) {
    updates.push('temp_name = ?');
    params.push(temp_name);
  }

  if (player_count !== undefined) {
    updates.push('player_count = ?');
    params.push(player_count);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben' });
  }

  params.push(id);

  const query = `
    UPDATE tables 
    SET ${updates.join(', ')}
    WHERE id = ?
  `;

  db.run(query, params, function(err) {
    if (err) {
      console.error('Fehler beim Aktualisieren des Tisches:', err);
      return res.status(500).json({ error: 'Fehler beim Aktualisieren des Tisches' });
    }
    res.json({ message: 'Tisch aktualisiert', changes: this.changes });
  });
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

// Reset match counter for a table
exports.resetTableCounter = (req, res) => {
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

    // Update the table's round_start value
    db.run('UPDATE tables SET round_start = ? WHERE id = ?', [roundStart, id], function(err) {
      if (err) {
        console.error('Fehler beim Zurücksetzen des Match-Zählers:', err);
        return res.status(500).json({ error: 'Fehler beim Zurücksetzen des Match-Zählers' });
      }
      res.json({ success: true, round_start: roundStart });
    });
  });
};
