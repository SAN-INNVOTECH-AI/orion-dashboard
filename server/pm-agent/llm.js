const Anthropic = require('@anthropic-ai/sdk')
const axios = require('axios')

function isAuthOrAvailabilityError(err) {
  const status = err?.status || err?.response?.status
  const msg = (err?.message || err?.response?.data?.error?.message || '').toLowerCase()
  return status === 401 || status === 403 || status === 429 || msg.includes('invalid x-api-key') || msg.includes('authentication_error') || msg.includes('overloaded')
}

async function callAnthropic({ userPrompt, anthropicModel = 'claude-haiku-4-5', maxTokens = 1200, systemPrompt = '' }) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) throw new Error('Anthropic key missing')

  const client = new Anthropic({ apiKey: anthropicKey })
  const msg = await client.messages.create({
    model: anthropicModel,
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: 'user', content: userPrompt }],
  })

  return {
    provider: 'anthropic',
    model: anthropicModel,
    text: msg.content?.[0]?.text || '',
  }
}

async function callOpenAIFallback({ systemPrompt, userPrompt, model, maxTokens = 1200 }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OpenAI fallback unavailable: OPENAI_API_KEY/OPENROUTER_API_KEY not set')

  const baseURL = process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1'
  const effectiveModel = model || process.env.OPENAI_MODEL || 'openai-codex/gpt-5.3-codex'

  const res = await axios.post(
    `${baseURL.replace(/\/$/, '')}/chat/completions`,
    {
      model: effectiveModel,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )

  return {
    provider: 'openai',
    model: effectiveModel,
    text: res.data?.choices?.[0]?.message?.content || '',
  }
}

async function callLLM({ userPrompt, anthropicModel = 'claude-haiku-4-5', maxTokens = 1200, systemPrompt = '', preferred = 'auto' }) {
  if (preferred === 'openai') {
    return callOpenAIFallback({ systemPrompt, userPrompt, maxTokens })
  }

  if (preferred === 'anthropic') {
    return callAnthropic({ userPrompt, anthropicModel, maxTokens, systemPrompt })
  }

  try {
    return await callAnthropic({ userPrompt, anthropicModel, maxTokens, systemPrompt })
  } catch (err) {
    if (!isAuthOrAvailabilityError(err)) throw err
    return callOpenAIFallback({ systemPrompt, userPrompt, maxTokens })
  }
}

async function checkAnthropicHealth() {
  try {
    const r = await callAnthropic({ userPrompt: 'OK', maxTokens: 8 })
    return { ok: true, provider: 'anthropic', model: r.model }
  } catch (err) {
    return { ok: false, provider: 'anthropic', message: err?.message || 'failed' }
  }
}

async function checkOpenAIHealth() {
  try {
    const r = await callOpenAIFallback({ userPrompt: 'OK', maxTokens: 8 })
    return { ok: true, provider: 'openai', model: r.model }
  } catch (err) {
    return { ok: false, provider: 'openai', message: err?.response?.data?.error?.message || err?.message || 'failed' }
  }
}

module.exports = { callLLM, checkAnthropicHealth, checkOpenAIHealth }
