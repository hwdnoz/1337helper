import express from 'express';
import { testCaseQueue, codeModificationQueue, leetcodeQueue, getJobStatus, addJobWithModel } from '../queue.js';

const router = express.Router();

// POST /api/jobs/leetcode
router.post('/jobs/leetcode', async (req, res) => {
  try {
    const { problem_number, custom_prompt } = req.body;

    const job = await addJobWithModel(leetcodeQueue, {
      problemNumber: problem_number,
      customPrompt: custom_prompt
    });

    res.status(202).json({
      job_id: job.id,
      status: 'submitted',
      message: 'Job submitted for processing'
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/jobs/test-cases
router.post('/jobs/test-cases', async (req, res) => {
  try {
    const { code } = req.body;

    const job = await addJobWithModel(testCaseQueue, {
      code
    });

    res.status(202).json({
      job_id: job.id,
      status: 'submitted',
      message: 'Test case generation job submitted'
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/jobs/code-modification
router.post('/jobs/code-modification', async (req, res) => {
  try {
    const { prompt, code } = req.body;

    const job = await addJobWithModel(codeModificationQueue, {
      prompt,
      code
    });

    res.status(202).json({
      job_id: job.id,
      status: 'submitted',
      message: 'Code modification job submitted'
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/jobs/:job_id
router.get('/jobs/:job_id', async (req, res) => {
  try {
    const { job_id } = req.params;

    // Try to find the job in all queues
    let jobStatus = null;

    // Try test-cases queue
    jobStatus = await getJobStatus(job_id, 'test-cases');
    if (jobStatus && jobStatus.state !== 'PENDING') {
      return res.json({
        job_id,
        state: jobStatus.state,
        status: jobStatus.status,
        result: jobStatus.result,
        error: jobStatus.error
      });
    }

    // Try code-modification queue
    jobStatus = await getJobStatus(job_id, 'code-modification');
    if (jobStatus && jobStatus.state !== 'PENDING') {
      return res.json({
        job_id,
        state: jobStatus.state,
        status: jobStatus.status,
        result: jobStatus.result,
        error: jobStatus.error
      });
    }

    // Try leetcode queue
    jobStatus = await getJobStatus(job_id, 'leetcode');
    if (jobStatus && jobStatus.state !== 'PENDING') {
      return res.json({
        job_id,
        state: jobStatus.state,
        status: jobStatus.status,
        result: jobStatus.result,
        error: jobStatus.error
      });
    }

    // Job not found in any queue
    res.json({
      job_id,
      state: 'PENDING',
      status: 'Job is waiting to be processed'
    });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

export default router;
