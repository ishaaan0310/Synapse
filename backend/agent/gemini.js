// ==========================================
// Minimal Google Gemini REST client (no npm package needed).
// Requires Node.js 18+ (built-in fetch).
// Docs: https://ai.google.dev/api/generate-content
// ==========================================

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const TIMEOUT_MS = 45 * 1000;

const isAgentEnabled = () => Boolean(process.env.GEMINI_API_KEY);

const getModel = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

// Turn API errors into messages a user can act on
const friendlyError = (status, apiMessage = '') => {
  if (status === 400 && /api key/i.test(apiMessage)) return 'The Gemini API key is invalid. Check GEMINI_API_KEY in backend/.env.';
  if (status === 401 || status === 403) return 'The Gemini API key was rejected. Check GEMINI_API_KEY in backend/.env.';
  if (status === 404) return `Gemini model "${getModel()}" was not found. Check GEMINI_MODEL in backend/.env.`;
  if (status === 429) return 'The Gemini free-tier limit was reached. Wait a minute and try again.';
  if (status >= 500) return 'Gemini is temporarily unavailable. Please try again shortly.';
  return apiMessage || `Gemini request failed (${status})`;
};

/**
 * Call models.generateContent.
 * @param {object} opts
 * @param {string} opts.systemInstruction
 * @param {Array}  opts.contents  - conversation turns ({ role, parts })
 * @param {Array}  opts.functionDeclarations
 * @returns {Promise<object>} raw API response
 */
async function generateContent({ systemInstruction, contents, functionDeclarations }) {
  if (typeof fetch !== 'function') {
    throw new GeminiError('The AI agent needs Node.js 18 or newer (built-in fetch).', 500);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    tools: functionDeclarations?.length ? [{ functionDeclarations }] : undefined,
    toolConfig: functionDeclarations?.length
      ? { functionCallingConfig: { mode: 'AUTO' } }
      : undefined
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}/${encodeURIComponent(getModel())}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new GeminiError('Gemini took too long to respond. Please try again.', 504);
    }
    throw new GeminiError(`Could not reach Gemini: ${error.message}`, 502);
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new GeminiError(friendlyError(response.status, data?.error?.message), response.status);
  }

  return data;
}

module.exports = { generateContent, isAgentEnabled, getModel, GeminiError };
