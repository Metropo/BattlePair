// /backend/controllers/matchController.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Verbinden mit der Datenbank (Matches):', err);
  } else {
    console.log('Mit SQLite-Datenbank verbunden (Matches)');
  }
});

// Tabelle "matches" erstellen, falls sie noch nicht existiert
db.run(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participants TEXT,
    game_mode_id INTEGER,
    is_started INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Fehler beim Erstellen der Tabelle "matches":', err);
  }
});

// Get matches with optional filtering and limiting
exports.getMatches = (req, res) => {
  const { is_started, limit, sort } = req.query;
  let query = 'SELECT * FROM matches';
  const params = [];

  if (is_started !== undefined) {
    query += ' WHERE is_started = ?';
    params.push(is_started);
  }

  // Add sorting based on the sort parameter
  if (sort === 'asc') {
    query += ' ORDER BY id ASC';
  } else {
    query += ' ORDER BY id DESC'; // Default to descending order
  }

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Matches:', err);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Matches' });
    }
    const matches = rows.map(row => ({
      id: row.id,
      participants: row.participants ? JSON.parse(row.participants) : [],
      game_mode_id: row.game_mode_id,
      is_started: row.is_started,
      created_at: row.created_at,
      started_at: row.started_at || null
    }));
    res.json(matches);
  });
};

// Match-Statistiken für einen Teilnehmer abrufen
exports.getParticipantMatchStats = (req, res) => {
  const { participantId, participantType } = req.params;
  
  // First get the round_start value for the participant
  const getRoundStartQuery = participantType === 'table' 
    ? 'SELECT round_start FROM tables WHERE id = ?'
    : 'SELECT round_start FROM walkins WHERE id = ?';

  db.get(getRoundStartQuery, [participantId], (err, participant) => {
    if (err) {
      console.error('Fehler beim Abrufen des round_start:', err);
      return res.status(500).json({ error: 'Fehler beim Abrufen des round_start' });
    }

    const roundStart = participant ? participant.round_start : 0;
    
    // Now get the match counts
    db.all(`
      SELECT 
        COUNT(CASE WHEN is_started = 1 AND id >= ? THEN 1 END) as played_matches,
        COUNT(CASE WHEN is_started = 0 AND id >= ? THEN 1 END) as planned_matches
      FROM matches
      WHERE EXISTS (
        SELECT 1 
        FROM json_each(participants) 
        WHERE json_extract(value, '$.id') = CAST(? AS TEXT)
          AND json_extract(value, '$.type') = ?
      )
    `, [roundStart, roundStart, participantId, participantType], (err, rows) => {
      if (err) {
        console.error('Fehler beim Abrufen der Match-Statistiken:', err);
        return res.status(500).json({ error: 'Fehler beim Abrufen der Match-Statistiken' });
      }
      res.json(rows[0] || { played_matches: 0, planned_matches: 0 });
    });
  });
};

// Ein neues Match anlegen (mit Teilnehmern und optionalem Spielmodus)
// Erwartet im Request-Body: { participants: [ ... ], game_mode_id: <number|null> }
exports.createMatch = (req, res) => {
  const { participants, game_mode_id } = req.body;
  if (!participants || !Array.isArray(participants)) {
    return res.status(400).json({ error: 'Teilnehmer müssen als Array übergeben werden' });
  }
  const participantsJson = JSON.stringify(participants);
  db.run(`INSERT INTO matches (participants, game_mode_id) VALUES (?, ?)`,
    [participantsJson, game_mode_id || null],
    function(err) {
    if (err) {
        console.error('Fehler beim Anlegen des Matches:', err);
      return res.status(500).json({ error: 'Fehler beim Anlegen des Matches' });
    }
    res.status(201).json({ message: 'Match angelegt', id: this.lastID });
    }
  );
};

// Ein bestehendes Match aktualisieren – hier können die Teilnehmer und der Spielmodus aktualisiert werden.
// Erwartet: { id, participants: [...], game_mode_id }
exports.updateMatch = (req, res) => {
  const { id, participants, game_mode_id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Match-ID ist erforderlich' });
  }
  if (!participants || !Array.isArray(participants)) {
    return res.status(400).json({ error: 'Teilnehmer müssen als Array übergeben werden' });
  }
  const participantsJson = JSON.stringify(participants);
  db.run(`UPDATE matches SET participants = ?, game_mode_id = ? WHERE id = ?`,
    [participantsJson, game_mode_id || null, id],
    function(err) {
    if (err) {
        console.error('Fehler beim Aktualisieren des Matches:', err);
      return res.status(500).json({ error: 'Fehler beim Aktualisieren des Matches' });
    }
    res.json({ message: 'Match aktualisiert' });
    }
  );
};

// Ein Match als gestartet markieren
// Erwartet: { id }
exports.startMatch = (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Match-ID ist erforderlich' });
  }
  db.run(`
    UPDATE matches 
    SET is_started = 1, 
        started_at = datetime('now')
    WHERE id = ?
  `, [id], function(err) {
    if (err) {
      console.error('Fehler beim Starten des Matches:', err);
      return res.status(500).json({ error: 'Fehler beim Starten des Matches' });
    }
    res.json({ message: 'Match gestartet' });
  });
};

// Ein Match als nicht gestartet markieren
// Erwartet: { id }
exports.unstartMatch = (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Match-ID ist erforderlich' });
  }
  db.run(`
    UPDATE matches 
    SET is_started = 0, 
        started_at = NULL 
    WHERE id = ?
  `, [id], function(err) {
    if (err) {
      console.error('Fehler beim Zurücksetzen des Matches:', err);
      return res.status(500).json({ error: 'Fehler beim Zurücksetzen des Matches' });
    }
    res.json({ message: 'Match zurückgesetzt' });
  });
};

// Ein Match löschen
// Erwartet: { id }
exports.deleteMatch = (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Match-ID ist erforderlich' });
  }
  db.run(`DELETE FROM matches WHERE id = ?`,
    [id],
    function(err) {
    if (err) {
        console.error('Fehler beim Löschen des Matches:', err);
      return res.status(500).json({ error: 'Fehler beim Löschen des Matches' });
    }
    res.json({ message: 'Match gelöscht' });
    }
  );
};

// Get the start time of the last match
exports.getLastMatchStartTime = (req, res) => {
  db.get(`
    SELECT started_at 
    FROM matches 
    WHERE is_started = 1 
    ORDER BY started_at DESC 
    LIMIT 1
  `, [], (err, row) => {
    if (err) {
      console.error('Fehler beim Abrufen der Startzeit des letzten Matches:', err);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Startzeit des letzten Matches' });
    }
    // Add 'Z' to indicate UTC timezone
    const started_at = row ? row.started_at + 'Z' : null;
    res.json({ started_at });
  });
};

// Delete all matches from the database
exports.deleteAllMatches = (req, res) => {
  db.run(`DELETE FROM matches`, [], function(err) {
    if (err) {
      console.error('Fehler beim Löschen aller Matches:', err);
      return res.status(500).json({ error: 'Fehler beim Löschen aller Matches' });
    }
    res.json({ message: 'Alle Matches wurden gelöscht' });
  });
};
