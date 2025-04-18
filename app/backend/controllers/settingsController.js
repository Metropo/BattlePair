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
    console.log('Mit SQLite-Datenbank verbunden (Settings)');
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

// Default settings if not found in database
const DEFAULT_SETTINGS = {
    display_matches_count: 4,
    match_length_minutes: 15,
    break_length_minutes: 5
};

// Get all settings
exports.getAllSettings = async (req, res) => {
    try {
        const settings = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM settings', (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
        
        // Merge with default settings
        const mergedSettings = { ...DEFAULT_SETTINGS };
        if (settings && Array.isArray(settings)) {
            settings.forEach(setting => {
                mergedSettings[setting.key] = parseInt(setting.value) || setting.value;
            });
        }

        res.json(mergedSettings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update settings
exports.updateSetting = async (req, res) => {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings data' });
    }

    try {
        // Start a transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Update each setting
        for (const [key, value] of Object.entries(settings)) {
            // Check if setting exists
            const existingSetting = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM settings WHERE key = ?', [key], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });
            
            if (existingSetting) {
                // Update existing setting
                await new Promise((resolve, reject) => {
                    db.run(
                        'UPDATE settings SET value = ? WHERE key = ?',
                        [value.toString(), key],
                        (err) => {
                            if (err) reject(err);
                            resolve();
                        }
                    );
                });
            } else {
                // Insert new setting
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO settings (key, value) VALUES (?, ?)',
                        [key, value.toString()],
                        (err) => {
                            if (err) reject(err);
                            resolve();
                        }
                    );
                });
            }
        }

        // Commit the transaction
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        res.json({ success: true });
    } catch (error) {
        // Rollback on error
        await new Promise((resolve) => {
            db.run('ROLLBACK', () => resolve());
        });
        
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
