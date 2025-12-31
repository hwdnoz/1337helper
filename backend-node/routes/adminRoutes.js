import express from 'express';
import { logger } from '../services/observabilityService.js';
import { cache } from '../services/cacheService.js';
import { prompts } from '../prompts/loader.js';

const router = express.Router();

// GET /api/observability/metrics
router.get('/observability/metrics', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const metrics = logger.getMetrics(limit);
    res.json({ metrics });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/observability/summary
router.get('/observability/summary', (req, res) => {
  try {
    const summary = logger.getSummaryStats();
    res.json({ summary });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/observability/call/:call_id
router.get('/observability/call/:call_id', (req, res) => {
  try {
    const { call_id } = req.params;
    const call = logger.getCallById(parseInt(call_id));

    if (call) {
      res.json({ call });
    } else {
      res.json({ success: false, error: 'Call not found' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/current-model
router.get('/current-model', async (req, res) => {
  try {
    const model = await cache.getCurrentModel();
    res.json({ model });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/current-model
router.post('/current-model', async (req, res) => {
  try {
    const { model } = req.body;
    if (!model) {
      return res.json({ success: false, error: 'No model specified' });
    }
    await cache.setCurrentModel(model);
    res.json({ model });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/prompts
router.get('/prompts', async (req, res) => {
  try {
    const promptList = await prompts.listAll();
    res.json({ prompts: promptList });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/prompts/:prompt_name
router.get('/prompts/:prompt_name', async (req, res) => {
  try {
    const { prompt_name } = req.params;
    const promptData = await prompts.getRaw(prompt_name);
    res.json({ prompt: promptData.content });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/prompts/:prompt_name
router.post('/prompts/:prompt_name', async (req, res) => {
  try {
    const { prompt_name } = req.params;
    const { content } = req.body;

    if (content === undefined) {
      return res.json({ success: false, error: 'No content provided' });
    }

    await prompts.set(prompt_name, content);
    res.json({ message: 'Prompt updated successfully' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// DELETE /api/prompts/:prompt_name
router.delete('/prompts/:prompt_name', async (req, res) => {
  try {
    const { prompt_name } = req.params;
    const defaultContent = await prompts.reset(prompt_name);
    res.json({
      message: 'Prompt reset to default',
      content: defaultContent
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

export default router;
