import Queue from 'bull';
import { processTestCaseTask, processCodeModificationTask, processLeetcodeTask } from './tasks.js';
import { cache } from './services/cacheService.js';

// Get Redis connection info
const redisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: 0
};

// Create Bull queues
export const testCaseQueue = new Queue('test-cases', { redis: redisConfig });
export const codeModificationQueue = new Queue('code-modification', { redis: redisConfig });
export const leetcodeQueue = new Queue('leetcode', { redis: redisConfig });

// Process test case generation jobs
testCaseQueue.process(async (job) => {
  const { code, currentModel, useCache, modelAwareCache } = job.data;

  // Update progress
  job.progress(10);

  const result = await processTestCaseTask(code, currentModel, useCache, modelAwareCache);

  job.progress(100);
  return result;
});

// Process code modification jobs
codeModificationQueue.process(async (job) => {
  const { prompt, code, currentModel, useCache, modelAwareCache } = job.data;

  job.progress(10);

  const result = await processCodeModificationTask(prompt, code, currentModel, useCache, modelAwareCache);

  job.progress(100);
  return result;
});

// Process LeetCode jobs
leetcodeQueue.process(async (job) => {
  const { problemNumber, customPrompt, currentModel, useCache, modelAwareCache } = job.data;

  job.progress(10);

  const result = await processLeetcodeTask(problemNumber, customPrompt, currentModel, useCache, modelAwareCache);

  job.progress(100);
  return result;
});

// Error handlers
testCaseQueue.on('failed', (job, err) => {
  console.error(`Test case job ${job.id} failed:`, err.message);
});

codeModificationQueue.on('failed', (job, err) => {
  console.error(`Code modification job ${job.id} failed:`, err.message);
});

leetcodeQueue.on('failed', (job, err) => {
  console.error(`LeetCode job ${job.id} failed:`, err.message);
});

// Helper function to get job status
export async function getJobStatus(jobId, queueType) {
  let queue;

  switch (queueType) {
    case 'test-cases':
      queue = testCaseQueue;
      break;
    case 'code-modification':
      queue = codeModificationQueue;
      break;
    case 'leetcode':
      queue = leetcodeQueue;
      break;
    default:
      return null;
  }

  const job = await queue.getJob(jobId);

  if (!job) {
    return {
      state: 'PENDING',
      status: 'Job is waiting to be processed'
    };
  }

  const state = await job.getState();
  const progress = job.progress();

  let status;
  switch (state) {
    case 'completed':
      status = 'Job completed successfully';
      break;
    case 'failed':
      status = `Job failed: ${job.failedReason}`;
      break;
    case 'active':
      status = `Job is being processed (${progress}%)`;
      break;
    case 'waiting':
      status = 'Job is waiting to be processed';
      break;
    case 'delayed':
      status = 'Job is delayed';
      break;
    default:
      status = `Job state: ${state}`;
  }

  const result = {
    state: state.toUpperCase(),
    status,
    progress
  };

  if (state === 'completed') {
    result.result = job.returnvalue;
  }

  if (state === 'failed') {
    result.error = job.failedReason;
  }

  return result;
}

// Helper function to add job and get current model from cache
export async function addJobWithModel(queue, data) {
  const currentModel = await cache.getCurrentModel();
  const useCache = await cache.isEnabled();
  const modelAwareCache = await cache.isModelAwareCache();

  return await queue.add({
    ...data,
    currentModel,
    useCache,
    modelAwareCache
  });
}
