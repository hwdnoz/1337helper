// API configuration
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    'VITE_API_URL is not defined. Please check your .env file.'
  );
}

export { API_URL };
