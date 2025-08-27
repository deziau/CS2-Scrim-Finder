const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'scrim_bot.db'));
        this.init();
    }

    init() {
        // Create tables
        this.db.serialize(() => {
            // Scrims table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS scrims (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    message_id TEXT UNIQUE,
                    thread_id TEXT,
                    team_name TEXT NOT NULL,
                    division TEXT NOT NULL,
                    scrim_date TEXT NOT NULL,
                    scrim_time TEXT NOT NULL,
                    maps TEXT NOT NULL,
                    has_server BOOLEAN NOT NULL,
                    user_id TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active'
                )
            `);

            // Maps table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS maps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // User profiles table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS profiles (
                    user_id TEXT PRIMARY KEY,
                    team_name TEXT,
                    division TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Alert preferences table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS alert_preferences (
                    user_id TEXT PRIMARY KEY,
                    alerts_enabled BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Insert default CS2 competitive maps
            const defaultMaps = [
                'Mirage', 'Dust2', 'Inferno', 'Cache', 'Overpass', 
                'Vertigo', 'Ancient', 'Anubis', 'Nuke'
            ];

            const stmt = this.db.prepare('INSERT OR IGNORE INTO maps (name) VALUES (?)');
            defaultMaps.forEach(map => stmt.run(map));
            stmt.finalize();
        });
    }

    // Scrim operations
    createScrim(scrimData) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO scrims (message_id, thread_id, team_name, division, scrim_date, scrim_time, maps, has_server, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                scrimData.messageId,
                scrimData.threadId,
                scrimData.teamName,
                scrimData.division,
                scrimData.scrimDate,
                scrimData.scrimTime,
                scrimData.maps,
                scrimData.hasServer,
                scrimData.userId
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    getActiveScrim(messageId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM scrims WHERE message_id = ? AND status = "active"',
                [messageId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    getAllActiveScrims() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM scrims WHERE status = "active" ORDER BY created_at DESC',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    updateScrimStatus(messageId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE scrims SET status = ? WHERE message_id = ?',
                [status, messageId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    getExpiredScrims() {
        return new Promise((resolve, reject) => {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            this.db.all(`
                SELECT * FROM scrims 
                WHERE status = "active" 
                AND (created_at < ? OR datetime(scrim_date || ' ' || scrim_time) < datetime('now'))
            `, [oneWeekAgo], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Map operations
    getAllMaps() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM maps ORDER BY name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    addMap(mapName) {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO maps (name) VALUES (?)', [mapName], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    removeMap(mapName) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM maps WHERE name = ?', [mapName], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Profile operations
    getProfile(userId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM profiles WHERE user_id = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    updateProfile(userId, teamName, division) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT OR REPLACE INTO profiles (user_id, team_name, division, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [userId, teamName, division], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Alert preferences
    getAlertPreference(userId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM alert_preferences WHERE user_id = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    setAlertPreference(userId, enabled) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT OR REPLACE INTO alert_preferences (user_id, alerts_enabled)
                VALUES (?, ?)
            `, [userId, enabled], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    getUsersWithAlertsEnabled() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT user_id FROM alert_preferences WHERE alerts_enabled = true',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.user_id));
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;