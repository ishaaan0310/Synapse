// ==========================================
// Minimal Google Gemini REST client (no npm package needed).
// Requires Node.js 18+ (built-in fetch).
// Docs: https://ai.google.dev/api/generate-content
//
// Reliability:
// - Retries temporary errors (429 rate limit, 500/503 overloaded) with backoff
// - If the main model keeps failing, tries GEMINI_FALLBACK_MODEL
// - Logs Google's real error message to the backend terminal
// ==========================================

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash';
const TIMEOUT_MS = 45 * 1000;
const RETRY_DELAYS_MS = [1000, 2500]; // waits before retry 1 and retry 2

const isAgentEnabled = () => Boolean(process.env.GEMINI_API_KEY);

const getModel = () => (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();

// Set GEMINI_FALLBACK_MODEL=none to disable the fallback
const getFallbackModel = () => {
  const value = (process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL).trim();
  return value && value !== 'none' && value !== getModel() ? value : null;
};

class GeminiError extends Error {
  constructor(message, status, apiMessage) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.apiMessage = apiMessage;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Errors worth retrying (temporary on Google's side)
const isTemporary = (status) => status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

// Errors where another model might work
const shouldTryFallback = (status) => isTemporary(status) || status === 404;

// Turn API errors into messages a user can act on
const friendlyError = (status, apiMessage = '', model = getModel()) => {
  const detail = apiMessage ? ` (Google said: ${apiMessage.slice(0, 160)})` : '';
  if (status === 400 && /api key|API_KEY/i.test(apiMessage)) return 'The Gemini API key is invalid. Create a new key at aistudio.google.com/apikey and put it in backend/.env.';
  if (status === 401 || status === 403) return `The Gemini API key was rejected. Create a new key at aistudio.google.com/apikey and put it in backend/.env.${detail}`;
  if (status === 404) return `Gemini model "${model}" was not found. Change GEMINI_MODEL in backend/.env.${detail}`;
  if (status === 429) return 'The Gemini free-tier limit was reached. Wait a minute and try again.';
  if (status >= 500) return `Gemini is busy right now. Please try again in a moment.${detail}`;
  return `Gemini request failed (${status})${detail}`;
};

async function callModel(model, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY.trim()
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
    const apiMessage = data?.error?.message || '';
    console.error(`[Gemini] ${response.status} from ${model}: ${apiMessage || 'no message'}`);
    throw new GeminiError(friendlyError(response.status, apiMessage, model), response.status, apiMessage);
  }

  return data;
}

// Call one model, retrying temporary failures
async function callWithRetries(model, body) {
  let lastError;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await callModel(model, body);
    } catch (error) {
      lastError = error;
      if (!isTemporary(error.status) || attempt === RETRY_DELAYS_MS.length) break;
      console.warn(`[Gemini] retrying ${model} in ${RETRY_DELAYS_MS[attempt]}ms...`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

/**
 * Call models.generateContent (with retries and model fallback).
 * @param {object} opts
 * @param {string} opts.systemInstruction
 * @param {Array}  opts.contents  - conversation turns ({ role, parts })
 * @param {Array}  opts.functionDeclarations
 * @param {string} [opts.model] - force a model (used to stay on the same
 *                                model for the rest of one agent run)
 * @returns {Promise<object>} raw API response, plus `_model` = model used
 */
async function generateContent({ systemInstruction, contents, functionDeclarations, model }) {
  if (typeof fetch !== 'function') {
    throw new GeminiError('The AI agent needs Node.js 18 or newer (built-in fetch).', 500);
  }

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    tools: functionDeclarations?.length ? [{ functionDeclarations }] : undefined,
    toolConfig: functionDeclarations?.length
      ? { functionCallingConfig: { mode: 'AUTO' } }
      : undefined
  };

  // Already mid-run on a model: stay on it (tool-call history is model-specific)
  if (model) {
    const data = await callWithRetries(model, body);
    return { ...data, _model: model };
  }

  try {
    const data = await callWithRetries(getModel(), body);
    return { ...data, _model: getModel() };
  } catch (error) {
    const fallback = getFallbackModel();
    if (!fallback || !shouldTryFallback(error.status)) throw error;

    console.warn(`[Gemini] ${getModel()} failed (${error.status}), trying fallback model ${fallback}`);
    const data = await callWithRetries(fallback, body);
    return { ...data, _model: fallback };
  }
}

module.exports = { generateContent, isAgentEnabled, getModel, getFallbackModel, GeminiError };
