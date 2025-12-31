import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './services/observabilityService.js';
import { cache } from './services/cacheService.js';
import { prompts } from './prompts/loader.js';

// Configure Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Remove markdown code blocks from response text
 */
function stripMarkdownCodeBlocks(text) {
  text = text.trim();
  if (text.startsWith('```python')) {
    return text.split('```python')[1].split('```')[0].trim();
  } else if (text.startsWith('```')) {
    return text.split('```')[1].split('```')[0].trim();
  }
  return text;
}

/**
 * Generic LLM task execution with caching, logging, and error handling
 */
async function executeLlmTask({
  prompt,
  operationType,
  currentModel,
  responseKey = 'response',
  cacheMetadata = null,
  postProcessor = null,
  useCache = true,
  modelAwareCache = true
}) {
  try {
    // Prepare cache metadata
    if (!cacheMetadata) {
      cacheMetadata = {};
    }
    cacheMetadata.model = currentModel;

    // Check cache
    const cachedResponse = await cache.get(
      prompt,
      operationType,
      currentModel,
      useCache,
      modelAwareCache,
      cacheMetadata !== { model: currentModel } ? cacheMetadata : null
    );

    if (cachedResponse) {
      let processedResponse = cachedResponse.response_text;
      if (postProcessor) {
        processedResponse = postProcessor(processedResponse);
      }

      return {
        success: true,
        [responseKey]: processedResponse,
        from_cache: true,
        semantic_cache_hit: cachedResponse.semantic_cache_hit || false,
        similarity_score: cachedResponse.similarity_score,
        cached_prompt: cachedResponse.prompt,
        current_prompt: cachedResponse.current_prompt,
        metadata: cachedResponse.metadata || {}
      };
    }

    // Make LLM call
    const startTime = Date.now();
    const model = genAI.getGenerativeModel({ model: currentModel });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const latencyMs = Date.now() - startTime;

    const responseText = response.text();

    // Post-process response if needed
    let processedResponse = responseText;
    if (postProcessor) {
      processedResponse = postProcessor(responseText);
    }

    // Log metrics
    logger.logLlmCall({
      operationType,
      prompt,
      responseText,
      tokensSent: prompt.split(' ').length,
      tokensReceived: responseText.split(' ').length,
      latencyMs,
      metadata: cacheMetadata
    });

    // Save to cache
    await cache.set(
      prompt,
      operationType,
      responseText,
      cacheMetadata,
      currentModel,
      useCache,
      modelAwareCache
    );

    return {
      success: true,
      [responseKey]: processedResponse,
      from_cache: false,
      latency_ms: latencyMs
    };

  } catch (error) {
    // Log error
    logger.logLlmCall({
      operationType,
      prompt,
      responseText: '',
      tokensSent: prompt.split(' ').length,
      tokensReceived: 0,
      latencyMs: 0,
      error: error.message,
      metadata: cacheMetadata
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Background task to generate test cases for code
 */
export async function processTestCaseTask(code, currentModel, useCache = true, modelAwareCache = true) {
  const prompt = await prompts.get('test_case_generation', { code });

  return await executeLlmTask({
    prompt,
    operationType: 'test_case_generation',
    currentModel,
    responseKey: 'test_cases',
    postProcessor: stripMarkdownCodeBlocks,
    useCache,
    modelAwareCache
  });
}

/**
 * Background task to modify code based on user prompt
 */
export async function processCodeModificationTask(userPrompt, code, currentModel, useCache = true, modelAwareCache = true) {
  const fullPrompt = await prompts.get('code_modification', { code, prompt: userPrompt });

  return await executeLlmTask({
    prompt: fullPrompt,
    operationType: 'code_modification',
    currentModel,
    responseKey: 'code',
    postProcessor: stripMarkdownCodeBlocks,
    useCache,
    modelAwareCache
  });
}

/**
 * Background task to process LeetCode problem
 */
export async function processLeetcodeTask(problemNumber, customPrompt, currentModel, useCache = true, modelAwareCache = true) {
  // Use custom prompt if provided, otherwise load from file
  let prompt;
  if (customPrompt) {
    prompt = customPrompt;
  } else {
    prompt = await prompts.get('leetcode_solve', { problem_number: problemNumber });
  }

  return await executeLlmTask({
    prompt,
    operationType: 'leetcode_solve',
    currentModel,
    responseKey: 'response',
    cacheMetadata: { problem_number: problemNumber },
    postProcessor: null, // No markdown stripping for leetcode
    useCache,
    modelAwareCache
  });
}
