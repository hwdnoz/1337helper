import express from 'express';

const router = express.Router();

// Mock data stores
let currentModel = 'gemini-1.5-flash';
const mockMetrics = [{ id: 1, model: 'gemini-1.5-flash', timestamp: Date.now() }];
const mockPrompts = [{ name: 'default', edited: false }];

// GET /api/observability/metrics
router.get('/observability/metrics', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ metrics: mockMetrics.slice(0, limit) });
});

// GET /api/observability/summary
router.get('/observability/summary', (req, res) => {
  res.json({
    summary: {
      total_calls: mockMetrics.length,
      total_tokens: 1000,
      total_cost: 0.05
    }
  });
});

// GET /api/observability/call/:call_id
router.get('/observability/call/:call_id', (req, res) => {
  const { call_id } = req.params;
  const call = mockMetrics.find(m => m.id === parseInt(call_id));

  if (call) {
    res.json({ call });
  } else {
    res.json({ success: false, error: 'Call not found' });
  }
});

// GET /api/current-model
router.get('/current-model', (req, res) => {
  res.json({ model: currentModel });
});

// POST /api/current-model
router.post('/current-model', (req, res) => {
  const { model } = req.body;
  if (!model) {
    return res.json({ success: false, error: 'No model specified' });
  }
  currentModel = model;
  res.json({ model: currentModel });
});

// GET /api/prompts
router.get('/prompts', (req, res) => {
  res.json({ prompts: mockPrompts });
});

// GET /api/prompts/:prompt_name
router.get('/prompts/:prompt_name', (req, res) => {
  const { prompt_name } = req.params;
  res.json({ prompt: `Mock content for ${prompt_name}` });
});

// POST /api/prompts/:prompt_name
router.post('/prompts/:prompt_name', (req, res) => {
  const { prompt_name } = req.params;
  const { content } = req.body;

  if (content === undefined) {
    return res.json({ success: false, error: 'No content provided' });
  }

  res.json({ message: 'Prompt updated successfully' });
});

// DELETE /api/prompts/:prompt_name
router.delete('/prompts/:prompt_name', (req, res) => {
  const { prompt_name } = req.params;
  res.json({
    message: 'Prompt reset to default',
    content: `Default content for ${prompt_name}`
  });
});

export default router;
