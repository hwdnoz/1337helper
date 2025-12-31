import Database from 'better-sqlite3';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import natural from 'natural';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const { TfIdf } = natural;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PromptCache {
  constructor(dbPath = null, ttlHours = 24) {
    if (!dbPath) {
      const projectRoot = join(__dirname, '..');
      dbPath = join(projectRoot, 'data', 'llm_cache.db');
    }

    // Ensure directory exists
    const dbDir = dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = dbPath;
    this.ttlHours = ttlHours;
    this.db = new Database(dbPath);
    this._initDatabase();

    // Initialize Redis client
    const redisPassword = process.env.REDIS_PASSWORD || '';
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1,
      password: redisPassword,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3
    });

    this.redis.on('error', (err) => {
      console.warn('Redis connection error (cache will use defaults):', err.message);
    });
  }

  _initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prompt_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_hash TEXT UNIQUE NOT NULL,
        prompt TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        model TEXT,
        response_text TEXT NOT NULL,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 1
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_prompt_hash ON prompt_cache(prompt_hash);
      CREATE INDEX IF NOT EXISTS idx_created_at ON prompt_cache(created_at);
    `);
  }

  async _getRedisBool(key, defaultValue = true) {
    try {
      const value = await this.redis.get(key);
      return value === '1' ? true : value === '0' ? false : defaultValue;
    } catch (err) {
      console.warn(`Redis get error for ${key}, using default:`, err.message);
      return defaultValue;
    }
  }

  async _setRedisBool(key, value) {
    try {
      await this.redis.set(key, value ? '1' : '0');
      return value;
    } catch (err) {
      console.warn(`Redis set error for ${key}:`, err.message);
      return value;
    }
  }

  async _getRedisString(key, defaultValue = null) {
    try {
      const value = await this.redis.get(key);
      return value || defaultValue;
    } catch (err) {
      console.warn(`Redis get error for ${key}, using default:`, err.message);
      return defaultValue;
    }
  }

  async _setRedisString(key, value) {
    try {
      await this.redis.set(key, value);
      return value;
    } catch (err) {
      console.warn(`Redis set error for ${key}:`, err.message);
      return value;
    }
  }

  async _getRedisFloat(key, defaultValue = null) {
    try {
      const value = await this.redis.get(key);
      return value ? parseFloat(value) : defaultValue;
    } catch (err) {
      console.warn(`Redis get error for ${key}, using default:`, err.message);
      return defaultValue;
    }
  }

  _hashPrompt(prompt, operationType, model = null, modelAwareCache = null) {
    // Determine if we should use model-aware caching
    const useModelAware = modelAwareCache !== null ? modelAwareCache : true; // Default to true for sync fallback

    let content;
    if (useModelAware) {
      const modelStr = model || 'unknown';
      content = `${operationType}:${modelStr}:${prompt}`;
    } else {
      content = `${operationType}:${prompt}`;
    }

    return createHash('sha256').update(content).digest('hex');
  }

  async get(prompt, operationType, model = null, useCache = null, modelAwareCache = null, metadata = null) {
    // Check if cache is enabled
    const shouldUseCache = useCache !== null ? useCache : await this._getRedisBool('cache_enabled', true);

    if (!shouldUseCache) {
      return null;
    }

    // Determine model-aware setting
    const useModelAware = modelAwareCache !== null ? modelAwareCache : await this._getRedisBool('model_aware_cache', true);

    // Try exact hash match first
    const promptHash = this._hashPrompt(prompt, operationType, model, useModelAware);
    const expiryTime = new Date(Date.now() - this.ttlHours * 60 * 60 * 1000).toISOString();

    const stmt = this.db.prepare(`
      SELECT * FROM prompt_cache
      WHERE prompt_hash = ? AND created_at > ?
    `);

    const row = stmt.get(promptHash, expiryTime);

    if (row) {
      // Update access stats
      const updateStmt = this.db.prepare(`
        UPDATE prompt_cache
        SET accessed_at = ?, access_count = access_count + 1
        WHERE prompt_hash = ?
      `);
      updateStmt.run(new Date().toISOString(), promptHash);

      return {
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      };
    }

    // Try semantic search if enabled
    return await this._findSimilarPrompt(prompt, operationType, model, useModelAware, metadata);
  }

  async set(prompt, operationType, responseText, metadata = null, model = null, useCache = null, modelAwareCache = null) {
    const shouldUseCache = useCache !== null ? useCache : await this._getRedisBool('cache_enabled', true);

    if (!shouldUseCache) {
      return;
    }

    const useModelAware = modelAwareCache !== null ? modelAwareCache : await this._getRedisBool('model_aware_cache', true);
    const promptHash = this._hashPrompt(prompt, operationType, model, useModelAware);
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO prompt_cache (
        prompt_hash, prompt, operation_type, model, response_text, metadata,
        created_at, accessed_at, access_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      promptHash, prompt, operationType, model, responseText, metadataJson,
      now, now, 1
    );
  }

  async _findSimilarPrompt(prompt, operationType, model, useModelAware, metadata) {
    const semanticEnabled = await this._getRedisBool('semantic_cache_enabled', false);

    if (!semanticEnabled) {
      return null;
    }

    const threshold = await this._getRedisFloat('semantic_similarity_threshold', 0.95);
    const expiryTime = new Date(Date.now() - this.ttlHours * 60 * 60 * 1000).toISOString();

    // Get all non-expired prompts for this operation type
    let stmt;
    let rows;

    if (useModelAware && model) {
      stmt = this.db.prepare(`
        SELECT * FROM prompt_cache
        WHERE operation_type = ? AND model = ? AND created_at > ?
      `);
      rows = stmt.all(operationType, model, expiryTime);
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM prompt_cache
        WHERE operation_type = ? AND created_at > ?
      `);
      rows = stmt.all(operationType, expiryTime);
    }

    if (rows.length === 0) {
      return null;
    }

    // Filter by metadata if provided
    let cachedPrompts = rows;
    if (metadata) {
      cachedPrompts = rows.filter(row => {
        if (!row.metadata) return false;
        try {
          const cachedMetadata = JSON.parse(row.metadata);
          return Object.entries(metadata).every(
            ([key, value]) => cachedMetadata[key] === value
          );
        } catch (err) {
          return false;
        }
      });
    }

    if (cachedPrompts.length === 0) {
      return null;
    }

    // Calculate TF-IDF similarity
    try {
      const tfidf = new TfIdf();

      // Add all cached prompts
      cachedPrompts.forEach(cp => tfidf.addDocument(cp.prompt));

      // Add current prompt
      tfidf.addDocument(prompt);

      // Find best match
      let bestMatch = null;
      let maxSimilarity = 0;
      const currentDocIndex = cachedPrompts.length; // Last document is current prompt

      cachedPrompts.forEach((cp, index) => {
        // Calculate cosine similarity using TF-IDF terms
        const terms1 = [];
        const terms2 = [];

        tfidf.listTerms(index).forEach(item => {
          terms1.push(item.tfidf);
        });

        tfidf.listTerms(currentDocIndex).forEach(item => {
          terms2.push(item.tfidf);
        });

        // Simple cosine similarity calculation
        const similarity = this._cosineSimilarity(terms1, terms2);

        if (similarity >= threshold && similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestMatch = cp;
        }
      });

      if (bestMatch) {
        // Update access stats
        const updateStmt = this.db.prepare(`
          UPDATE prompt_cache
          SET accessed_at = ?, access_count = access_count + 1
          WHERE prompt_hash = ?
        `);
        updateStmt.run(new Date().toISOString(), bestMatch.prompt_hash);

        return {
          ...bestMatch,
          metadata: bestMatch.metadata ? JSON.parse(bestMatch.metadata) : null,
          similarity_score: maxSimilarity,
          semantic_cache_hit: true,
          current_prompt: prompt
        };
      }
    } catch (err) {
      console.warn('Semantic search error:', err.message);
      return null;
    }

    return null;
  }

  _cosineSimilarity(vec1, vec2) {
    if (vec1.length === 0 || vec2.length === 0) return 0;

    // Pad vectors to same length
    const maxLen = Math.max(vec1.length, vec2.length);
    const v1 = [...vec1, ...new Array(maxLen - vec1.length).fill(0)];
    const v2 = [...vec2, ...new Array(maxLen - vec2.length).fill(0)];

    const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    const mag1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  }

  clearExpired() {
    const expiryTime = new Date(Date.now() - this.ttlHours * 60 * 60 * 1000).toISOString();
    const stmt = this.db.prepare('DELETE FROM prompt_cache WHERE created_at < ?');
    const result = stmt.run(expiryTime);
    return result.changes;
  }

  clearAll() {
    const stmt = this.db.prepare('DELETE FROM prompt_cache');
    const result = stmt.run();
    return result.changes;
  }

  async getStats() {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total_entries,
        SUM(access_count) as total_accesses,
        AVG(access_count) as avg_accesses_per_entry
      FROM prompt_cache
    `).get();

    const operationBreakdown = this.db.prepare(`
      SELECT operation_type, COUNT(*) as count
      FROM prompt_cache
      GROUP BY operation_type
    `).all();

    const breakdown = {};
    operationBreakdown.forEach(row => {
      breakdown[row.operation_type] = row.count;
    });

    return {
      total_entries: stats.total_entries || 0,
      total_accesses: stats.total_accesses || 0,
      avg_accesses_per_entry: stats.avg_accesses_per_entry ? Math.round(stats.avg_accesses_per_entry * 100) / 100 : 0,
      operation_breakdown: breakdown,
      ttl_hours: this.ttlHours,
      enabled: await this._getRedisBool('cache_enabled', true),
      model_aware_cache: await this._getRedisBool('model_aware_cache', true),
      semantic_cache_enabled: await this._getRedisBool('semantic_cache_enabled', false)
    };
  }

  async setEnabled(enabled) {
    return await this._setRedisBool('cache_enabled', enabled);
  }

  async isEnabled() {
    return await this._getRedisBool('cache_enabled', true);
  }

  async setModelAwareCache(modelAware) {
    return await this._setRedisBool('model_aware_cache', modelAware);
  }

  async isModelAwareCache() {
    return await this._getRedisBool('model_aware_cache', true);
  }

  async setCurrentModel(model) {
    return await this._setRedisString('current_model', model);
  }

  async getCurrentModel() {
    return await this._getRedisString('current_model', 'gemini-2.0-flash-exp');
  }

  async setSemanticCacheEnabled(enabled) {
    return await this._setRedisBool('semantic_cache_enabled', enabled);
  }

  async isSemanticCacheEnabled() {
    return await this._getRedisBool('semantic_cache_enabled', false);
  }

  getAllEntries(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT
        id, prompt_hash, operation_type, model,
        substr(prompt, 1, 100) as prompt_preview,
        substr(response_text, 1, 100) as response_preview,
        created_at, accessed_at, access_count
      FROM prompt_cache
      ORDER BY accessed_at DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  close() {
    this.db.close();
    this.redis.quit();
  }
}

// Global cache instance
export const cache = new PromptCache();
export default PromptCache;
