const { app, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ══════════════════════════════════════════════════════════════════════════════
// DATA STORE
// Persists settings and cached Asana data to disk via SQLite.
// API key is encrypted at rest using the OS keychain via safeStorage.
// ══════════════════════════════════════════════════════════════════════════════

const DB_FILE = 'panoptisana.db';
const BACKUP_FILE = 'panoptisana.db.bak';
const SCHEMA_VERSION = '1';

class Store {
  constructor() {
    const userDataDir = app.getPath('userData');
    this._dbPath = path.join(userDataDir, DB_FILE);
    this._backupPath = path.join(userDataDir, BACKUP_FILE);

    // Back up existing database before opening
    this._backup();

    // Open database, check integrity, initialize schema
    this._db = this._openDatabase();
    this._initSchema();
    this._prepareStatements();
  }

  // ── Database Lifecycle ────────────────────────────────────────

  _backup() {
    try {
      if (fs.existsSync(this._dbPath)) {
        fs.copyFileSync(this._dbPath, this._backupPath);
      }
    } catch (err) {
      console.error('[store] Failed to create backup:', err.message);
    }
  }

  _openDatabase() {
    let db;
    try {
      db = new Database(this._dbPath);
      // Check integrity
      const result = db.pragma('quick_check', { simple: true });
      if (result !== 'ok') {
        throw new Error(`Integrity check failed: ${result}`);
      }
    } catch (err) {
      console.error('[store] Database issue:', err.message);
      // Close if open
      if (db) {
        try { db.close(); } catch (_) { /* ignore */ }
      }
      // Attempt restore from backup
      if (fs.existsSync(this._backupPath)) {
        console.log('[store] Restoring from backup...');
        try {
          fs.copyFileSync(this._backupPath, this._dbPath);
          db = new Database(this._dbPath);
        } catch (restoreErr) {
          console.error('[store] Backup restore failed:', restoreErr.message);
          // Last resort: start fresh
          try { fs.unlinkSync(this._dbPath); } catch (_) { /* ignore */ }
          db = new Database(this._dbPath);
        }
      } else {
        // No backup — start fresh
        try { fs.unlinkSync(this._dbPath); } catch (_) { /* ignore */ }
        db = new Database(this._dbPath);
      }
    }

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    return db;
  }

  _initSchema() {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS cache (
        key        TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        fetched_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS seen_timestamps (
        task_gid  TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Set schema version (only on first creation)
    const existing = this._db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version');
    if (!existing) {
      this._db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', SCHEMA_VERSION);
    }
  }

  _prepareStatements() {
    this._stmts = {
      getAllSettings:  this._db.prepare('SELECT key, value FROM settings'),
      getSetting:     this._db.prepare('SELECT value FROM settings WHERE key = ?'),
      setSetting:     this._db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
      getCache:       this._db.prepare('SELECT data FROM cache WHERE key = ?'),
      setCache:       this._db.prepare('INSERT OR REPLACE INTO cache (key, data, fetched_at) VALUES (?, ?, ?)'),
      getAllSeen:     this._db.prepare('SELECT task_gid, timestamp FROM seen_timestamps'),
      setSeen:        this._db.prepare('INSERT OR REPLACE INTO seen_timestamps (task_gid, timestamp) VALUES (?, ?)')
    };

    // Transaction for batch settings updates
    this._setManySettings = this._db.transaction((entries) => {
      for (const [key, value] of entries) {
        this._stmts.setSetting.run(key, JSON.stringify(value));
      }
    });
  }

  // ── Encryption (safeStorage — OS Keychain) ────────────────────

  encryptApiKey(plaintext) {
    if (!plaintext) return null;
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[store] safeStorage encryption not available');
      return null;
    }
    const encrypted = safeStorage.encryptString(plaintext);
    return { safeStorage: true, data: encrypted.toString('base64') };
  }

  decryptApiKey(encryptedObj) {
    if (!encryptedObj) return null;
    try {
      if (encryptedObj.safeStorage && encryptedObj.data) {
        if (!safeStorage.isEncryptionAvailable()) {
          console.error('[store] safeStorage decryption not available');
          return null;
        }
        const buffer = Buffer.from(encryptedObj.data, 'base64');
        return safeStorage.decryptString(buffer);
      }
      return null;
    } catch (err) {
      console.error('[store] Failed to decrypt API key:', err.message);
      return null;
    }
  }

  // ── Settings ──────────────────────────────────────────────────

  getSettings() {
    const rows = this._stmts.getAllSettings.all();
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (_) {
        settings[row.key] = row.value;
      }
    }
    return settings;
  }

  setSettings(updates) {
    if (!updates || typeof updates !== 'object') return;
    this._setManySettings(Object.entries(updates));
  }

  // ── Cached Data ───────────────────────────────────────────────

  getCachedTasks() {
    const row = this._stmts.getCache.get('tasks');
    if (!row) return [];
    try {
      return JSON.parse(row.data);
    } catch (_) {
      return [];
    }
  }

  setCachedTasks(tasks) {
    this._stmts.setCache.run('tasks', JSON.stringify(tasks), Date.now());
  }

  getCachedProjects() {
    const row = this._stmts.getCache.get('projects');
    if (!row) return [];
    try {
      return JSON.parse(row.data);
    } catch (_) {
      return [];
    }
  }

  setCachedProjects(projects) {
    this._stmts.setCache.run('projects', JSON.stringify(projects), Date.now());
  }

  getCachedUsers() {
    const row = this._stmts.getCache.get('users');
    if (!row) return [];
    try {
      return JSON.parse(row.data);
    } catch (_) {
      return [];
    }
  }

  setCachedUsers(users) {
    this._stmts.setCache.run('users', JSON.stringify(users), null);
  }

  // ── Comment Tracking ──────────────────────────────────────────

  getSeenTimestamps() {
    const rows = this._stmts.getAllSeen.all();
    const timestamps = {};
    for (const row of rows) {
      timestamps[row.task_gid] = row.timestamp;
    }
    return timestamps;
  }

  setSeenTimestamp(taskGid, timestamp) {
    if (!taskGid || !timestamp) return;
    this._stmts.setSeen.run(taskGid, timestamp);
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  flush() {
    if (this._db && this._db.open) {
      try {
        this._db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (err) {
        console.error('[store] WAL checkpoint failed:', err.message);
      }
    }
  }
}

module.exports = { Store };
