import express from 'express';
import { randomUUID } from 'crypto';

const router = express.Router();

// Mock job store
const jobs = new Map();

// POST /api/jobs/leetcode
router.post('/jobs/leetcode', (req, res) => {
  const { problem_number, custom_prompt } = req.body;
  const job_id = randomUUID();

  jobs.set(job_id, {
    id: job_id,
    type: 'leetcode',
    status: 'PENDING',
    data: { problem_number, custom_prompt }
  });

  res.status(202).json({
    job_id,
    status: 'submitted',
    message: 'Job submitted for processing'
  });
});

// POST /api/jobs/test-cases
router.post('/jobs/test-cases', (req, res) => {
  const { code } = req.body;
  const job_id = randomUUID();

  jobs.set(job_id, {
    id: job_id,
    type: 'test-cases',
    status: 'PENDING',
    data: { code }
  });

  res.status(202).json({
    job_id,
    status: 'submitted',
    message: 'Test case generation job submitted'
  });
});

// POST /api/jobs/code-modification
router.post('/jobs/code-modification', (req, res) => {
  const { prompt, code } = req.body;
  const job_id = randomUUID();

  jobs.set(job_id, {
    id: job_id,
    type: 'code-modification',
    status: 'PENDING',
    data: { prompt, code }
  });

  res.status(202).json({
    job_id,
    status: 'submitted',
    message: 'Code modification job submitted'
  });
});

// GET /api/jobs/:job_id
router.get('/jobs/:job_id', (req, res) => {
  const { job_id } = req.params;
  const job = jobs.get(job_id);

  if (job) {
    res.json({
      job_id,
      state: job.status,
      status: `Job state: ${job.status}`
    });
  } else {
    res.json({
      job_id,
      state: 'PENDING',
      status: 'Job is waiting to be processed'
    });
  }
});

export default router;
