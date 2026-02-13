const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ══════════════════════════════════════════════════════════════════════════════
// DATA STORE
// Persists settings and cached Asana data to disk.
// API key is encrypted at rest using a machine-derived key.
// ══════════════════════════════════════════════════════════════════════════════

const STORE_FILE = 'panorasana-data.json';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

class Store {
  constructor() {
    this._filePath = path.join(app.getPath('userData'), STORE_FILE);
    this._data = this._load();
    this._saveTimer = null;
  }

  // ── Encryption ──────────────────────────────────────────────

  // Derive a machine-specific key from the app path and user data path
  _getDerivedKey() {
    const machineId = app.getPath('userData') + app.getPath('exe');
    return crypto.createHash('sha256').update(machineId).digest();
  }

  encryptApiKey(plaintext) {
    if (!plaintext) return null;
    const key = this._getDerivedKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { iv: iv.toString('hex'), encrypted, authTag };
  }

  decryptApiKey(encryptedObj) {
    if (!encryptedObj || !encryptedObj.iv || !encryptedObj.encrypted) return null;
    try {
      const key = this._getDerivedKey();
      const iv = Buffer.from(encryptedObj.iv, 'hex');
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
      let decrypted = decipher.update(encryptedObj.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('[store] Failed to decrypt API key:', err.message);
      return null;
    }
  }

  // ── Data Access ─────────────────────────────────────────────

  getData() {
    return this._data;
  }

  getSettings() {
    return this._data.settings || {};
  }

  setSettings(updates) {
    this._data.settings = { ...this._data.settings, ...updates };
    this._scheduleSave();
  }

  getCachedTasks() {
    return this._data.cachedTasks || [];
  }

  setCachedTasks(tasks) {
    this._data.cachedTasks = tasks;
    this._data.lastTaskFetch = Date.now();
    this._scheduleSave();
  }

  getCachedProjects() {
    return this._data.cachedProjects || [];
  }

  setCachedProjects(projects) {
    this._data.cachedProjects = projects;
    this._data.lastProjectFetch = Date.now();
    this._scheduleSave();
  }

  getCachedUsers() {
    return this._data.cachedUsers || [];
  }

  setCachedUsers(users) {
    this._data.cachedUsers = users;
    this._scheduleSave();
  }

  // Track last-seen modified_at timestamp per task (for comment highlighting)
  getSeenTimestamps() {
    return this._data.seenTimestamps || {};
  }

  setSeenTimestamp(taskGid, timestamp) {
    if (!this._data.seenTimestamps) {
      this._data.seenTimestamps = {};
    }
    this._data.seenTimestamps[taskGid] = timestamp;
    this._scheduleSave();
  }

  // ── Persistence ─────────────────────────────────────────────

  _load() {
    try {
      if (fs.existsSync(this._filePath)) {
        const raw = fs.readFileSync(this._filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[store] Failed to load data:', err.message);
    }
    return { settings: {}, cachedTasks: [], cachedProjects: [], cachedUsers: [], seenTimestamps: {} };
  }

  _save() {
    try {
      const dir = path.dirname(this._filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this._filePath, JSON.stringify(this._data, null, 2), 'utf8');
    } catch (err) {
      console.error('[store] Failed to save data:', err.message);
    }
  }

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 500);
  }

  // Force immediate save (for app quit)
  flush() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    this._save();
  }
}

module.exports = { Store };
