const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const { fetchWithRetry } = require('./fetch-retry')

// Load config from config.json (sibling to scripts folder)
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json')

function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8')
    return JSON.parse(configData)
  } catch (err) {
    throw new Error(`Failed to load config from ${CONFIG_PATH}: ${err.message}`)
  }
}

const config = loadConfig()

// Configuration from config.json
let API_HUB_API_KEY = config.apiKey
const API_HUB_BASE_URL = config.baseUrl || 'https://api.heybossai.com/v1'

/**
 * Check if a key is a placeholder (not yet configured)
 * @param {string} key
 * @returns {boolean}
 */
function isPlaceholderKey(key) {
  return !key || key === 'YOUR_API_KEY_HERE'
}

/**
 * Auto-provision a free trial token if the current key is a placeholder.
 * Persists the new key to config.json so subsequent calls reuse it.
 * @returns {Promise<string>} A valid API key
 */
async function ensureApiKey() {
  // 1. Current key is good
  if (!isPlaceholderKey(API_HUB_API_KEY)) {
    return API_HUB_API_KEY
  }

  // 2. Re-read config (another call may have provisioned already)
  try {
    const freshConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    if (!isPlaceholderKey(freshConfig.apiKey)) {
      API_HUB_API_KEY = freshConfig.apiKey
      return API_HUB_API_KEY
    }
  } catch {
    // If re-read fails, continue to provision
  }

  // 3. Auto-provision from API Hub
  console.error('[skillboss] Provisioning free trial token...')
  const resp = await fetch(`${API_HUB_BASE_URL}/temp-token/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(
      `Failed to provision free trial token (${resp.status}). ` +
        `Visit https://www.skillboss.co to get an API key.\n${errText}`,
    )
  }

  const data = await resp.json()

  // 4. Save to config.json
  try {
    const freshConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    freshConfig.apiKey = data.api_key
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(freshConfig, null, 2) + '\n')
  } catch (writeErr) {
    console.error(`[skillboss] Warning: could not save key to config.json: ${writeErr.message}`)
  }

  console.error(
    `[skillboss] Free trial active ($${data.balance_usd} credit). ` +
      `Sign up at https://www.skillboss.co for more credits.`,
  )
  API_HUB_API_KEY = data.api_key
  return API_HUB_API_KEY
}

/**
 * Check response for balance warning and print to stderr
 * @param {object} data - Response data from API Hub
 */
function handleBalanceWarning(data) {
  if (!data || !data._balance_warning) {
    return
  }
  const warning = data._balance_warning
  if (typeof warning === 'string') {
    console.error(`[skillboss] ${warning}`)
  } else if (typeof warning === 'object' && warning.message) {
    console.error(`[skillboss] ${warning.message}`)
    if (warning.bind_url) {
      console.error(`[skillboss] Sign up & keep your credits: ${warning.bind_url}`)
    }
  }
}

/**
 * Simple HTTP client for API Hub
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<object>} Response data
 */
async function apiHubPost(endpoint, data) {
  const apiKey = await ensureApiKey()

  const response = await fetchWithRetry(`${API_HUB_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Hub request failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  handleBalanceWarning(result)
  return result
}

/**
 * Stream response from API Hub (SSE)
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @yields {object} Parsed SSE data chunks
 */
async function* apiHubStream(endpoint, data) {
  const apiKey = await ensureApiKey()

  const response = await fetchWithRetry(`${API_HUB_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Hub request failed: ${response.status} ${errorText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        const chunk = trimmed.slice(6)
        if (chunk === '[DONE]') return
        try {
          const parsed = JSON.parse(chunk)
          // Handle balance warning in stream
          if (parsed._balance_warning) {
            handleBalanceWarning(parsed)
          } else {
            yield parsed
          }
        } catch {
          // Skip non-JSON data lines
        }
      }
    }
  }
}

/**
 * Save binary response to file
 * @param {Response} response - Fetch Response object
 * @param {string} outputPath - File path to save to
 */
async function saveBinaryResponse(response, outputPath) {
  const fileStream = fs.createWriteStream(outputPath)
  await pipeline(Readable.fromWeb(response.body), fileStream)
}

/**
 * Simple HTTP GET client for API Hub
 * @param {string} endpoint - API endpoint
 * @returns {Promise<object>} Response data
 */
async function apiHubGet(endpoint) {
  const apiKey = await ensureApiKey()

  const response = await fetchWithRetry(`${API_HUB_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Hub request failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  handleBalanceWarning(result)
  return result
}

/**
 * Make a raw API Hub request that may return binary data
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<Response>} Raw fetch Response
 */
async function apiHubRaw(endpoint, data) {
  const apiKey = await ensureApiKey()

  const response = await fetchWithRetry(`${API_HUB_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Hub request failed: ${response.status} ${errorText}`)
  }

  return response
}

module.exports = {
  loadConfig,
  config,
  API_HUB_API_KEY,
  API_HUB_BASE_URL,
  isPlaceholderKey,
  ensureApiKey,
  handleBalanceWarning,
  apiHubPost,
  apiHubStream,
  saveBinaryResponse,
  apiHubGet,
  apiHubRaw,
}
