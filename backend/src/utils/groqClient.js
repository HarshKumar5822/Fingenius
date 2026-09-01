const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Recommended high-performance chat model on Groq's developer API tier
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODELS = ['qwen/qwen3.8-27b', 'groq/compound', 'openai/gpt-oss-120b'];

/**
 * Calls Groq's chat completions endpoint with automatic model fallback.
 * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages
 * @param {{ temperature?: number, maxTokens?: number }} options
 */
export const callGroq = async (messages, options = {}) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const err = new Error('AI assistant is not configured yet. Add a GROQ_API_KEY in the backend .env file to enable it.');
    err.code = 'GROQ_NOT_CONFIGURED';
    throw err;
  }

  const requestedModel = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const modelsToTry = [requestedModel, ...FALLBACK_MODELS.filter(m => m !== requestedModel)];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 1500
        })
      });

      if (!response.ok) {
        let detail = '';
        try {
          const errBody = await response.json();
          detail = errBody?.error?.message || JSON.stringify(errBody);
        } catch {
          detail = await response.text();
        }

        // If model not found or invalid request, try next model in fallback list
        if (response.status === 404 || response.status === 400) {
          console.warn(`Groq model ${model} failed (${response.status}: ${detail}). Trying fallback...`);
          lastError = new Error(`Groq API error (${response.status}): ${detail}`);
          continue;
        }

        const err = new Error(`Groq API error (${response.status}): ${detail}`);
        err.code = 'GROQ_REQUEST_FAILED';
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      const choice = data?.choices?.[0]?.message;
      const content = choice?.content?.trim() || choice?.reasoning?.trim() || '';

      if (content) {
        return content;
      }
    } catch (err) {
      if (err.code === 'GROQ_REQUEST_FAILED' || err.code === 'GROQ_NOT_CONFIGURED') {
        throw err;
      }
      lastError = err;
    }
  }

  const finalErr = lastError || new Error('Failed to get a response from Groq API after trying fallback models.');
  finalErr.code = 'GROQ_REQUEST_FAILED';
  throw finalErr;
};

