import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ObservabilityLogger {
  constructor(dbPath = null) {
    if (!dbPath) {
      const projectRoot = join(__dirname, '..');
      dbPath = join(projectRoot, 'data', 'llm_metrics.db');
    }

    // Ensure directory exists
    const dbDir = dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this._initDatabase();
  }

  _initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS llm_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        prompt_preview TEXT NOT NULL,
        prompt_length INTEGER NOT NULL,
        response_text TEXT NOT NULL,
        response_preview TEXT NOT NULL,
        response_length INTEGER NOT NULL,
        tokens_sent INTEGER NOT NULL,
        tokens_received INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        latency_ms REAL NOT NULL,
        success BOOLEAN NOT NULL,
        error TEXT,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON llm_calls(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_operation_type ON llm_calls(operation_type);
      CREATE INDEX IF NOT EXISTS idx_success ON llm_calls(success);
    `);
  }

  logLlmCall({
    operationType,
    prompt,
    responseText,
    tokensSent,
    tokensReceived,
    latencyMs,
    error = null,
    metadata = null
  }) {
    const timestamp = new Date().toISOString();
    const promptPreview = prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt;
    const responsePreview = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText;
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const stmt = this.db.prepare(`
      INSERT INTO llm_calls (
        timestamp, operation_type, prompt, prompt_preview, prompt_length,
        response_text, response_preview, response_length,
        tokens_sent, tokens_received, total_tokens,
        latency_ms, success, error, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      timestamp, operationType, prompt, promptPreview, prompt.length,
      responseText, responsePreview, responseText.length,
      tokensSent, tokensReceived, tokensSent + tokensReceived,
      latencyMs, error === null, error, metadataJson
    );

    return {
      timestamp,
      operationType,
      tokensSent,
      tokensReceived,
      latencyMs,
      success: error === null
    };
  }

  getMetrics(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT
        id, timestamp, operation_type, prompt, prompt_preview, prompt_length,
        response_text, response_preview, response_length, tokens_sent, tokens_received,
        total_tokens, latency_ms, success, error, metadata
      FROM llm_calls
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit);

    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }

  getSummaryStats() {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_calls,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_calls,
        SUM(total_tokens) as total_tokens,
        AVG(latency_ms) as avg_latency_ms,
        SUM(latency_ms) as total_latency_ms
      FROM llm_calls
    `).get();

    const operationBreakdown = this.db.prepare(`
      SELECT operation_type, COUNT(*) as count
      FROM llm_calls
      GROUP BY operation_type
    `).all();

    const breakdown = {};
    operationBreakdown.forEach(row => {
      breakdown[row.operation_type] = row.count;
    });

    return {
      total_calls: stats.total_calls || 0,
      successful_calls: stats.successful_calls || 0,
      failed_calls: stats.failed_calls || 0,
      total_tokens: stats.total_tokens || 0,
      avg_latency_ms: stats.avg_latency_ms ? Math.round(stats.avg_latency_ms * 100) / 100 : 0,
      total_latency_ms: stats.total_latency_ms ? Math.round(stats.total_latency_ms * 100) / 100 : 0,
      operation_breakdown: breakdown
    };
  }

  getCallById(callId) {
    const stmt = this.db.prepare('SELECT * FROM llm_calls WHERE id = ?');
    const row = stmt.get(callId);

    if (row) {
      return {
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      };
    }
    return null;
  }

  close() {
    this.db.close();
  }
}

// Global logger instance
export const logger = new ObservabilityLogger();
export default ObservabilityLogger;
