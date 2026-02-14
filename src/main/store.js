const { app, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

// ══════════════════════════════════════════════════════════════════════════════
// DATA STORE
// Persists settings and cached Asana data to disk.
// API key is encrypted at rest using the OS keychain via safeStorage.
// ══════════════════════════════════════════════════════════════════════════════

const STORE_FILE = 'panoptisana-data.json';

class Store {
  constructor() {
    this._filePath = path.join(app.getPath('userData'), STORE_FILE);
    this._data = this._load();
    this._saveTimer = null;

    // Migrate legacy AES-256-GCM encrypted keys to safeStorage
    this._migrateLegacyApiKey();
  }

  // ── Encryption (safeStorage — OS Keychain) ────────────────

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
      // Handle safeStorage format
      if (encryptedObj.safeStorage && encryptedObj.data) {
        if (!safeStorage.isEncryptionAvailable()) {
          console.error('[store] safeStorage decryption not available');
          return null;
        }
        const buffer = Buffer.from(encryptedObj.data, 'base64');
        return safeStorage.decryptString(buffer);
      }
      // Handle legacy AES-256-GCM format (for migration)
      if (encryptedObj.iv && encryptedObj.encrypted) {
        return this._decryptLegacy(encryptedObj);
      }
      return null;
    } catch (err) {
      console.error('[store] Failed to decrypt API key:', err.message);
      return null;
    }
  }

  // Legacy decryption for migration only
  _decryptLegacy(encryptedObj) {
    try {
      const crypto = require('crypto');
      const machineId = app.getPath('userData') + app.getPath('exe');
      const key = crypto.createHash('sha256').update(machineId).digest();
      const iv = Buffer.from(encryptedObj.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
      let decrypted = decipher.update(encryptedObj.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('[store] Legacy decryption failed:', err.message);
      return null;
    }
  }

  // Migrate from legacy AES-256-GCM to safeStorage
  _migrateLegacyApiKey() {
    const settings = this.getSettings();
    if (settings.apiKey && settings.apiKey.iv && settings.apiKey.encrypted && !settings.apiKey.safeStorage) {
      const plaintext = this._decryptLegacy(settings.apiKey);
      if (plaintext) {
        const newEncrypted = this.encryptApiKey(plaintext);
        if (newEncrypted) {
          this.setSettings({ apiKey: newEncrypted });
          console.log('[store] Migrated API key from AES-256-GCM to safeStorage');
        }
      }
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
