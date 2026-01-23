/**
 * Utility module for managing Google API Key in sessionStorage
 *
 * Security principles:
 * - API key is stored only in sessionStorage (cleared when tab closes)
 * - Never persisted to disk, database, or server
 * - Each request includes the key from browser storage
 */

const API_KEY_STORAGE_KEY = 'google_api_key';

/**
 * Get the stored Google API key from sessionStorage
 * @returns {string|null} The API key or null if not set
 */
export const getApiKey = () => {
  return sessionStorage.getItem(API_KEY_STORAGE_KEY);
};

/**
 * Store the Google API key in sessionStorage
 * @param {string} apiKey - The API key to store
 */
export const setApiKey = (apiKey) => {
  if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
  }
};

/**
 * Remove the stored API key from sessionStorage
 */
export const clearApiKey = () => {
  sessionStorage.removeItem(API_KEY_STORAGE_KEY);
};

/**
 * Check if an API key is currently set
 * @returns {boolean} True if API key exists in storage
 */
export const hasApiKey = () => {
  const key = getApiKey();
  return key !== null && key.trim() !== '';
};

/**
 * Add API key to request body for POST requests
 * @param {Object} body - The request body object
 * @returns {Object} Body with API key added
 */
export const addApiKeyToBody = (body = {}) => {
  const apiKey = getApiKey();
  if (apiKey) {
    return { ...body, google_api_key: apiKey };
  }
  return body;
};

/**
 * Add API key to headers
 * @param {Object} headers - The headers object
 * @returns {Object} Headers with API key added
 */
export const addApiKeyToHeaders = (headers = {}) => {
  const apiKey = getApiKey();
  if (apiKey) {
    return { ...headers, 'X-Google-API-Key': apiKey };
  }
  return headers;
};

/**
 * Add API key to URL query params for GET requests
 * @param {string} url - The URL to modify
 * @returns {string} URL with API key query parameter
 */
export const addApiKeyToUrl = (url) => {
  const apiKey = getApiKey();
  if (apiKey) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}google_api_key=${encodeURIComponent(apiKey)}`;
  }
  return url;
};
