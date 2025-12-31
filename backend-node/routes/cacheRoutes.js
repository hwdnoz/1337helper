import express from 'express';
import { cache } from '../services/cacheService.js';

const router = express.Router();

// GET /api/cache/stats
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cache.getStats();
    res.json({ stats });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/cache/entries
router.get('/cache/entries', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const entries = cache.getAllEntries(limit);
    res.json({ entries });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/cache/clear
router.post('/cache/clear', (req, res) => {
  try {
    const deletedCount = cache.clearAll();
    res.json({ deleted_count: deletedCount });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/cache/clear-expired
router.post('/cache/clear-expired', (req, res) => {
  try {
    const deletedCount = cache.clearExpired();
    res.json({ deleted_count: deletedCount });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/cache/enabled
router.get('/cache/enabled', async (req, res) => {
  try {
    const enabled = await cache.isEnabled();
    res.json({ enabled });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/cache/enabled
router.post('/cache/enabled', async (req, res) => {
  try {
    const enabled = req.body.enabled !== undefined ? req.body.enabled : true;
    await cache.setEnabled(enabled);
    const currentValue = await cache.isEnabled();
    res.json({ enabled: currentValue });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/cache/model-aware
router.get('/cache/model-aware', async (req, res) => {
  try {
    const modelAware = await cache.isModelAwareCache();
    res.json({ model_aware: modelAware });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/cache/model-aware
router.post('/cache/model-aware', async (req, res) => {
  try {
    const modelAware = req.body.model_aware !== undefined ? req.body.model_aware : true;
    await cache.setModelAwareCache(modelAware);
    const currentValue = await cache.isModelAwareCache();
    res.json({ model_aware: currentValue });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/cache/semantic-enabled
router.get('/cache/semantic-enabled', async (req, res) => {
  try {
    const semanticEnabled = await cache.isSemanticCacheEnabled();
    res.json({ semantic_enabled: semanticEnabled });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/cache/semantic-enabled
router.post('/cache/semantic-enabled', async (req, res) => {
  try {
    const semanticEnabled = req.body.semantic_enabled !== undefined ? req.body.semantic_enabled : false;
    await cache.setSemanticCacheEnabled(semanticEnabled);
    const currentValue = await cache.isSemanticCacheEnabled();
    res.json({ semantic_enabled: currentValue });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

export default router;
