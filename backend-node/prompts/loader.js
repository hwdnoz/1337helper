import Redis from 'ioredis';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PromptLoader {
  constructor(defaultsDir = null) {
    if (!defaultsDir) {
      // TODO: only works in Docker atm. Local dev needs update
      defaultsDir = '/prompts/defaults';
    }
    this.defaultsDir = defaultsDir;
    this.fileCache = {};

    // Initialize Redis client
    const redisPassword = process.env.REDIS_PASSWORD || '';
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1,
      password: redisPassword,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3
    });

    this.redis.on('error', (err) => {
      console.warn('Redis connection error (prompts will use defaults):', err.message);
    });
  }

  _loadDefault(promptName) {
    if (!this.fileCache[promptName]) {
      const path = join(this.defaultsDir, `${promptName}.txt`);
      this.fileCache[promptName] = fs.readFileSync(path, 'utf-8');
    }
    return this.fileCache[promptName];
  }

  async get(promptName, params = {}) {
    try {
      // Check Redis for edited version
      const edited = await this.redis.get(`prompt:${promptName}`);

      if (edited) {
        return this._formatPrompt(edited, params);
      }
    } catch (err) {
      // If Redis fails, continue to default
      console.warn(`Redis error when fetching prompt ${promptName}, using default:`, err.message);
    }

    // Fallback to default file
    const defaultPrompt = this._loadDefault(promptName);
    return this._formatPrompt(defaultPrompt, params);
  }

  async getRaw(promptName) {
    try {
      // Check Redis for edited version
      const edited = await this.redis.get(`prompt:${promptName}`);

      if (edited) {
        return {
          content: edited,
          is_edited: true,
          source: 'redis'
        };
      }
    } catch (err) {
      console.warn(`Redis error when fetching raw prompt ${promptName}:`, err.message);
    }

    // Fallback to default file
    const defaultPrompt = this._loadDefault(promptName);
    return {
      content: defaultPrompt,
      is_edited: false,
      source: 'default'
    };
  }

  async set(promptName, content) {
    try {
      await this.redis.set(`prompt:${promptName}`, content);
      return content;
    } catch (err) {
      console.error(`Redis error when setting prompt ${promptName}:`, err.message);
      throw err;
    }
  }

  async reset(promptName) {
    try {
      await this.redis.del(`prompt:${promptName}`);
      return this._loadDefault(promptName);
    } catch (err) {
      console.error(`Redis error when resetting prompt ${promptName}:`, err.message);
      throw err;
    }
  }

  async listAll() {
    const prompts = [];

    // Get all default prompt files
    const files = fs.readdirSync(this.defaultsDir);

    for (const filename of files) {
      if (filename.endsWith('.txt')) {
        const promptName = filename.slice(0, -4); // Remove .txt
        const info = await this.getRaw(promptName);
        prompts.push({
          name: promptName,
          is_edited: info.is_edited,
          source: info.source
        });
      }
    }

    return prompts;
  }

  _formatPrompt(template, params) {
    let result = template;

    // Replace {key} with params.key
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      result = result.replaceAll(placeholder, value);
    }

    return result;
  }

  close() {
    this.redis.quit();
  }
}

// Global instance
export const prompts = new PromptLoader();
export default PromptLoader;
