import express from 'express';

const router = express.Router();

// Mock cache settings
let cacheSettings = {
  enabled: true,
  model_aware: true,
  semantic_enabled: false
};

// Mock cache data
const mockCacheEntries = [
  { id: 1, key: 'prompt:123', value: 'cached response', timestamp: Date.now() }
];

// GET /api/cache/stats
router.get('/cache/stats', (req, res) => {
  res.json({
    stats: {
      hits: 10,
      misses: 5,
      total_entries: mockCacheEntries.length,
      hit_rate: 0.67
    }
  });
});

// GET /api/cache/entries
router.get('/cache/entries', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ entries: mockCacheEntries.slice(0, limit) });
});

// GET /api/cache/enabled
router.get('/cache/enabled', (req, res) => {
  res.json({ enabled: cacheSettings.enabled });
});

// POST /api/cache/enabled
router.post('/cache/enabled', (req, res) => {
  const { enabled } = req.body;
  cacheSettings.enabled = enabled !== undefined ? enabled : true;
  res.json({ enabled: cacheSettings.enabled });
});

// GET /api/cache/model-aware
router.get('/cache/model-aware', (req, res) => {
  res.json({ model_aware: cacheSettings.model_aware });
});

// POST /api/cache/model-aware
router.post('/cache/model-aware', (req, res) => {
  const { model_aware } = req.body;
  cacheSettings.model_aware = model_aware !== undefined ? model_aware : true;
  res.json({ model_aware: cacheSettings.model_aware });
});

// GET /api/cache/semantic-enabled
router.get('/cache/semantic-enabled', (req, res) => {
  res.json({ semantic_enabled: cacheSettings.semantic_enabled });
});

// POST /api/cache/semantic-enabled
router.post('/cache/semantic-enabled', (req, res) => {
  const { semantic_enabled } = req.body;
  cacheSettings.semantic_enabled = semantic_enabled !== undefined ? semantic_enabled : false;
  res.json({ semantic_enabled: cacheSettings.semantic_enabled });
});

// POST /api/cache/clear
router.post('/cache/clear', (req, res) => {
  const deletedCount = mockCacheEntries.length;
  mockCacheEntries.length = 0;
  res.json({ deleted_count: deletedCount });
});

// POST /api/cache/clear-expired
router.post('/cache/clear-expired', (req, res) => {
  // Mock clearing expired entries
  const deletedCount = 2;
  res.json({ deleted_count: deletedCount });
});

export default router;
