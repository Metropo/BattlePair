const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Pfad zur SQLite-Datenbank
const dbPath = path.join(__dirname, '../database/database.sqlite');

// Datenbankverbindung herstellen
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Fehler beim Verbinden mit der Datenbank:', err);
    } else {
        console.log('Mit SQLite-Datenbank verbunden (Images)');
        
        // Create images table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                data BLOB NOT NULL,
                mime_type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Fehler beim Erstellen der Images-Tabelle:', err);
            } else {
                console.log('Images-Tabelle ist bereit');
            }
        });
    }
});

// Get an image by name
exports.getImage = async (req, res) => {
    const { name } = req.params;

    try {
        const image = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM images WHERE name = ?', [name], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        res.set('Content-Type', image.mime_type);
        res.send(image.data);
    } catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Upload or update an image
exports.uploadImage = async (req, res) => {
    const { name } = req.params;
    const { data, mime_type } = req.body;
    // Decode base64 data to binary
    let binaryData;
    try {
        // Remove potential data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
        binaryData = Buffer.from(base64Data, 'base64');
    } catch (error) {
        console.error('Error decoding base64 data:', error);
        return res.status(400).json({ error: 'Invalid base64 data' });
    }

    if (!data || !mime_type) {
        return res.status(400).json({ error: 'Image data and mime type are required' });
    }

    try {
        // Check if image exists
        const existingImage = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM images WHERE name = ?', [name], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (existingImage) {
            // Update existing image
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE images SET data = ?, mime_type = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
                    [binaryData, mime_type, name],
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    }
                );
            });
        } else {
            // Insert new image
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO images (name, data, mime_type) VALUES (?, ?, ?)',
                    [name, binaryData, mime_type],
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    }
                );
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete an image
exports.deleteImage = async (req, res) => {
    const { name } = req.params;

    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM images WHERE name = ?', [name], (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 