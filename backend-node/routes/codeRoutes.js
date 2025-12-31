import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createContext, runInContext } from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// GET /api/code - Get default code
router.get('/code', (req, res) => {
  try {
    const projectRoot = join(__dirname, '..');
    const defaultProblemPath = join(projectRoot, 'default_problem.py');
    const code = readFileSync(defaultProblemPath, 'utf-8');
    res.json({ code });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/run - Execute code
router.post('/run', async (req, res) => {
  try {
    const { code } = req.body;

    // For Python code, we can't actually execute it in Node.js
    // We would need a Python runtime or use child_process to call Python
    // For now, return a message indicating this limitation
    // In production, you'd want to use child_process.spawn to run Python

    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', code]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (exitCode) => {
        if (exitCode === 0) {
          res.json({ success: true, stdout });
        } else {
          res.json({ success: false, error: stderr || 'Execution failed' });
        }
      });

      python.on('error', (err) => {
        res.json({ success: false, error: err.message });
      });

      // Set timeout
      setTimeout(() => {
        python.kill();
        res.json({ success: false, error: 'Execution timeout' });
      }, 5000);
    });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/available-models - List available models
router.get('/available-models', async (req, res) => {
  try {
    // List available Gemini models
    const models = [
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    res.json({ success: true, models });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

export default router;
