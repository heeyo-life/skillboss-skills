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
const API_HUB_API_KEY = config.apiKey
const API_HUB_BASE_URL = config.baseUrl || 'https://api.heybossai.com/v1'

/**
 * Simple HTTP client for API Hub
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<object>} Response data
 */
async function apiHubPost(endpoint, data) {
  if (!API_HUB_API_KEY || API_HUB_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error(
      'API key not configured. Please update config.json with your API key.',
    )
  }

  const response = await fetchWithRetry(`${API_HUB_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_HUB_API_KEY}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Hub request failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Stream response from API Hub (SSE)
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @yields {object} Parsed SSE data chunks
 */
async function* apiHubStream(endpoint, data) {
  if (!API_HUB_API_KEY || API_HUB_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error(
      'API key not configured. Please update config.json with your API key.',
    )
  }

  const response = await fetchWithRetry(`${API_HUB_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_HUB_API_KEY}`,
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
        const data = trimmed.slice(6)
        if (data === '[DONE]') return
        try {
          yield JSON.parse(data)
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
  if (!API_HUB_API_KEY || API_HUB_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('API key not configured. Please update config.json with your API key.')
  }

  const response = await fetchWithRetry(`${API_HUB_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${API_HUB_API_KEY}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Hub request failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Make a raw API Hub request that may return binary data
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<Response>} Raw fetch Response
 */
async function apiHubRaw(endpoint, data) {
  if (!API_HUB_API_KEY || API_HUB_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error(
      'API key not configured. Please update config.json with your API key.',
    )
  }

  const response = await fetchWithRetry(`${API_HUB_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_HUB_API_KEY}`,
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
  apiHubPost,
  apiHubStream,
  saveBinaryResponse,
  apiHubGet,
  apiHubRaw,
}
