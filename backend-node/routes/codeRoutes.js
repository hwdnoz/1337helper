import express from 'express';
import { readFileSync } from 'fs';

const router = express.Router();

// GET /api/code - Get default code
router.get('/code', (req, res) => {
  try {
    // Mock reading default problem file
    const code = 'def solution():\n    pass';
    res.json({ code });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/run - Execute code
router.post('/run', (req, res) => {
  try {
    const { code } = req.body;
    // Mock code execution (don't actually execute for security)
    res.json({
      success: true,
      stdout: 'Code execution not implemented in Node.js version'
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/available-models - List available models
router.get('/available-models', (req, res) => {
  try {
    // Mock model list
    const models = [
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro'
    ];
    res.json({ success: true, models });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

export default router;
