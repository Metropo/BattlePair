const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Get all data from a table
function getAllFromTable(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Backup data from specified tables
exports.createBackup = async (req, res) => {
  try {
    const { includeWalkins = false, includeMatches = false } = req.body;
    
    // Always include these tables
    const tables = ['tables', 'game_modes', 'settings'];
    
    // Add optional tables if requested
    if (includeWalkins) tables.push('walkins');
    if (includeMatches) tables.push('matches');

    // Get data from all tables
    const backupData = {};
    for (const table of tables) {
      backupData[table] = await getAllFromTable(table);
    }

    // Add metadata
    backupData.metadata = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: tables
    };

    res.json(backupData);
  } catch (err) {
    console.error('Fehler beim Erstellen des Backups:', err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Backups' });
  }
};

// Restore data from backup
exports.restoreBackup = async (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ error: 'Ungültiges Backup-Format' });
    }

    // Get all existing tables
    const existingTables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.name));
      });
    });

    // Restore each table that exists in both backup and current database
    for (const [tableName, rows] of Object.entries(backupData)) {
      if (tableName === 'metadata') continue;
      
      if (existingTables.includes(tableName)) {
        // Get column names for the table
        const columns = await new Promise((resolve, reject) => {
          db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => row.name));
          });
        });

        // Clear existing data
        await new Promise((resolve, reject) => {
          db.run(`DELETE FROM ${tableName}`, [], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Insert backup data, only using columns that exist in current table
        for (const row of rows) {
          const validColumns = Object.keys(row).filter(key => columns.includes(key));
          const placeholders = validColumns.map(() => '?').join(',');
          const values = validColumns.map(key => row[key]);
          
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO ${tableName} (${validColumns.join(',')}) VALUES (${placeholders})`,
              values,
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }
    }

    res.json({ success: true, message: 'Backup erfolgreich wiederhergestellt' });
  } catch (err) {
    console.error('Fehler beim Wiederherstellen des Backups:', err);
    res.status(500).json({ error: 'Fehler beim Wiederherstellen des Backups' });
  }
}; 