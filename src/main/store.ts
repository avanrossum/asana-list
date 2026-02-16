import { app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

import type { AsanaTask, AsanaProject, AsanaUser, EncryptedApiKey, Settings } from '../shared/types';

// ══════════════════════════════════════════════════════════════════════════════
// DATA STORE
// Persists settings and cached Asana data to disk via SQLite.
// API key is encrypted at rest using the OS keychain via safeStorage.
// ══════════════════════════════════════════════════════════════════════════════

const DB_FILE = 'panoptisana.db';
const BACKUP_FILE = 'panoptisana.db.bak';
const SCHEMA_VERSION = '1';

interface SettingsRow {
  key: string;
  value: string;
}

interface CacheRow {
  data: string;
}

interface SeenRow {
  task_gid: string;
  timestamp: string;
}

interface MetaRow {
  value: string;
}

interface PreparedStatements {
  getAllSettings: Database.Statement;
  getSetting: Database.Statement;
  setSetting: Database.Statement;
  getCache: Database.Statement;
  setCache: Database.Statement;
  getAllSeen: Database.Statement;
  setSeen: Database.Statement;
}

export class Store {
  private _dbPath: string;
  private _backupPath: string;
  private _db!: Database.Database;
  private _stmts!: PreparedStatements;
  private _setManySettings!: Database.Transaction<(entries: [string, unknown][]) => void>;

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

  private _backup(): void {
    try {
      if (fs.existsSync(this._dbPath)) {
        fs.copyFileSync(this._dbPath, this._backupPath);
      }
    } catch (err) {
      console.error('[store] Failed to create backup:', (err as Error).message);
    }
  }

  private _openDatabase(): Database.Database {
    let db: Database.Database | undefined;
    try {
      db = new Database(this._dbPath);
      // Check integrity
      const result = db.pragma('quick_check', { simple: true });
      if (result !== 'ok') {
        throw new Error(`Integrity check failed: ${result}`);
      }
    } catch (err) {
      console.error('[store] Database issue:', (err as Error).message);
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
          console.error('[store] Backup restore failed:', (restoreErr as Error).message);
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
    db!.pragma('journal_mode = WAL');
    db!.pragma('foreign_keys = ON');

    return db!;
  }

  private _initSchema(): void {
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
    const existing = this._db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as MetaRow | undefined;
    if (!existing) {
      this._db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', SCHEMA_VERSION);
    }
  }

  private _prepareStatements(): void {
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
    this._setManySettings = this._db.transaction((entries: [string, unknown][]) => {
      for (const [key, value] of entries) {
        this._stmts.setSetting.run(key, JSON.stringify(value));
      }
    });
  }

  // ── Encryption (safeStorage — OS Keychain) ────────────────────

  encryptApiKey(plaintext: string): EncryptedApiKey | null {
    if (!plaintext) return null;
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[store] safeStorage encryption not available');
      return null;
    }
    const encrypted = safeStorage.encryptString(plaintext);
    return { safeStorage: true, data: encrypted.toString('base64') };
  }

  decryptApiKey(encryptedObj: EncryptedApiKey | null): string | null {
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
      console.error('[store] Failed to decrypt API key:', (err as Error).message);
      return null;
    }
  }

  // ── Settings ──────────────────────────────────────────────────

  getSettings(): Partial<Settings> {
    const rows = this._stmts.getAllSettings.all() as SettingsRow[];
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (_) {
        settings[row.key] = row.value;
      }
    }
    return settings as Partial<Settings>;
  }

  setSettings(updates: Record<string, unknown>): void {
    if (!updates || typeof updates !== 'object') return;
    this._setManySettings(Object.entries(updates));
  }

  // ── Cached Data ───────────────────────────────────────────────

  getCachedTasks(): AsanaTask[] {
    const row = this._stmts.getCache.get('tasks') as CacheRow | undefined;
    if (!row) return [];
    try {
      return JSON.parse(row.data);
    } catch (_) {
      return [];
    }
  }

  setCachedTasks(tasks: AsanaTask[]): void {
    this._stmts.setCache.run('tasks', JSON.stringify(tasks), Date.now());
  }

  getCachedProjects(): AsanaProject[] {
    const row = this._stmts.getCache.get('projects') as CacheRow | undefined;
    if (!row) return [];
    try {
      return JSON.parse(row.data);
    } catch (_) {
      return [];
    }
  }

  setCachedProjects(projects: AsanaProject[]): void {
    this._stmts.setCache.run('projects', JSON.stringify(projects), Date.now());
  }

  getCachedUsers(): AsanaUser[] {
    const row = this._stmts.getCache.get('users') as CacheRow | undefined;
    if (!row) return [];
    try {
      return JSON.parse(row.data);
    } catch (_) {
      return [];
    }
  }

  setCachedUsers(users: AsanaUser[]): void {
    this._stmts.setCache.run('users', JSON.stringify(users), null);
  }

  // ── Comment Tracking ──────────────────────────────────────────

  getSeenTimestamps(): Record<string, string> {
    const rows = this._stmts.getAllSeen.all() as SeenRow[];
    const timestamps: Record<string, string> = {};
    for (const row of rows) {
      timestamps[row.task_gid] = row.timestamp;
    }
    return timestamps;
  }

  setSeenTimestamp(taskGid: string, timestamp: string): void {
    if (!taskGid || !timestamp) return;
    this._stmts.setSeen.run(taskGid, timestamp);
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  flush(): void {
    if (this._db && this._db.open) {
      try {
        this._db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (err) {
        console.error('[store] WAL checkpoint failed:', (err as Error).message);
      }
    }
  }
}
