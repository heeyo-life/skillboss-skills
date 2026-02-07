#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const { fetchWithRetry } = require('./lib/fetch-retry')

/**
 * SkillBoss API Hub - Multi-Provider API Gateway Client
 *
 * Provides unified access to multiple AI/ML providers:
 * - Chat: bedrock, openai, openrouter, vertex, anthropic, minimax, perplexity
 * - TTS: elevenlabs, minimax, openai, replicate
 * - Image: vertex/gemini-3-pro-image-preview, replicate/flux
 * - Search: scrapingdog, perplexity, firecrawl
 * - Video: minimax
 * - Document: reducto (parse, extract, split, edit)
 * - SMS/Verify: prelude (OTP send/check)
 * - Email: aws/ses
 *
 * Usage:
 *   node api-hub.js run --model "vendor/model" --inputs '{"key":"value"}' [--stream] [--output file]
 *   node api-hub.js chat --model "bedrock/claude-4-sonnet" --prompt "Hello" [--system "..."] [--stream]
 *   node api-hub.js tts --model "elevenlabs/eleven_multilingual_v2" --text "Hello" --output audio.mp3
 *   node api-hub.js image --model "vertex/gemini-3-pro-image-preview" --prompt "A sunset" [--output image.png]
 *   node api-hub.js image --model "replicate/black-forest-labs/flux-schnell" --prompt "A sunset" [--output image.png]
 *   node api-hub.js search --model "scrapingdog/google_search" --query "nodejs"
 *   node api-hub.js scrape --model "firecrawl/scrape" --url "https://example.com"
 *   node api-hub.js sms-verify --phone "+1234567890"
 *   node api-hub.js sms-check --phone "+1234567890" --code "123456"
 *   node api-hub.js send-email --to "a@b.com" --subject "Subject" --body "<html>...</html>"
 *   node api-hub.js send-batch --subject "Hello {{name}}" --body "<html>...</html>" --receivers '[...]'
 */

// Load config from config.json (sibling to scripts folder)
const CONFIG_PATH = path.join(__dirname, '..', 'config.json')

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

/**
 * Sends a single email using AWS SES via API Hub
 * Sender is automatically determined from user lookup (name@name.skillboss.live)
 * @param {object} params - Email parameters
 * @param {string} params.subject - Email subject line
 * @param {string} params.bodyHtml - Email body in HTML format
 * @param {string[]} params.receivers - Array of recipient email addresses
 * @param {string[]} [params.replyTo] - Reply-to email addresses
 * @param {string} [params.projectId] - Optional project identifier
 * @returns {Promise<object>} Email send status
 */
async function sendEmail(params) {
  const data = {
    title: params.subject,
    body_html: params.bodyHtml,
    receivers: params.receivers,
    project_id: params.projectId,
  }
  if (params.replyTo) data.reply_to = params.replyTo

  return apiHubPost('/send-email', data)
}

/**
 * Sends batch emails with template variables using AWS SES via API Hub
 * Supports {{variable}} template syntax in subject and body
 * Sender is automatically determined from user lookup (name@name.skillboss.live)
 * @param {object} params - Batch email parameters
 * @param {string} params.subject - Email subject line with template variables
 * @param {string} params.bodyHtml - Email body in HTML format with template variables
 * @param {Array<{email: string, variables: object}>} params.receivers - Recipients with template variables
 * @param {string[]} [params.replyTo] - Reply-to email addresses
 * @param {string} [params.projectId] - Optional project identifier
 * @returns {Promise<object>} Batch email results with per-email status
 */
async function sendBatchEmails(params) {
  const data = {
    title: params.subject,
    body_html: params.bodyHtml,
    receivers: params.receivers,
    project_id: params.projectId,
  }
  if (params.replyTo) data.reply_to = params.replyTo

  return apiHubPost('/send-emails', data)
}

// ============================================================================
// HIGH-LEVEL COMMAND FUNCTIONS
// ============================================================================

/**
 * Generic run command - mirrors /run endpoint exactly
 * @param {object} params - Run parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {object} params.inputs - Model-specific inputs
 * @param {boolean} [params.stream] - Enable streaming
 * @param {string} [params.output] - Output file path for binary responses
 * @param {boolean} [params.autoFallback] - Enable automatic fallback on errors (default: true)
 * @returns {Promise<object|AsyncGenerator>} Response data or stream
 */
async function run(params) {
  const request = {
    model: params.model,
    inputs: params.inputs,
    stream: params.stream || false,
    auto_fallback: params.autoFallback !== false, // Enable by default
  }

  if (params.stream) {
    return apiHubStream('/run', request)
  }

  if (params.output) {
    const response = await apiHubRaw('/run', request)
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      await saveBinaryResponse(response, params.output)
      return { saved: params.output }
    }
    // For JSON responses, check for errors before saving
    const data = await response.json()
    if (data.code && data.code >= 400) {
      throw new Error(data.message || `API error: ${data.code}`)
    }

    // Check if response contains media URL(s) and download the actual file
    let mediaUrl = null
    let mediaType = 'file'

    // Image URL patterns
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      typeof data[0] === 'string' &&
      data[0].startsWith('http')
    ) {
      // Flux-style response: ["https://..."]
      mediaUrl = data[0]
      mediaType = 'image'
    } else if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
      // DALL-E style response: {data: [{url: "https://..."}]}
      mediaUrl = data.data[0].url
      mediaType = 'image'
    } else if (
      data.generated_images &&
      Array.isArray(data.generated_images) &&
      data.generated_images[0]
    ) {
      // Gemini-style response: {generated_images: ["https://..."]}
      mediaUrl = data.generated_images[0]
      mediaType = 'image'
    } else if (
      data.image_url &&
      typeof data.image_url === 'string' &&
      data.image_url.startsWith('http')
    ) {
      // MM-style response: {image_url: "https://..."}
      mediaUrl = data.image_url
      mediaType = 'image'
    }
    // Audio URL patterns
    else if (
      data.audio_url &&
      typeof data.audio_url === 'string' &&
      data.audio_url.startsWith('http')
    ) {
      // MM TTS response: {audio_url: "https://..."}
      mediaUrl = data.audio_url
      mediaType = 'audio'
    }
    // Video URL patterns
    else if (data.video_url) {
      // Common video response: {video_url: "https://..."}
      mediaUrl = data.video_url
      mediaType = 'video'
    } else if (
      data.output &&
      typeof data.output === 'string' &&
      data.output.startsWith('http')
    ) {
      // Replicate-style response: {output: "https://..."}
      mediaUrl = data.output
      mediaType = 'video'
    } else if (
      data.video &&
      typeof data.video === 'string' &&
      data.video.startsWith('http')
    ) {
      // Alternative video response: {video: "https://..."}
      mediaUrl = data.video
      mediaType = 'video'
    } else if (data.file_id && data.base_resp?.status_code === 0) {
      // MiniMax async video - need to poll for result
      // For now, return the response and let user know it's processing
      console.log('Video generation started. File ID:', data.file_id)
      fs.writeFileSync(params.output, JSON.stringify(data, null, 2))
      return { processing: true, file_id: data.file_id, saved: params.output }
    } else if (
      data.generatedSamples &&
      Array.isArray(data.generatedSamples) &&
      data.generatedSamples[0]?.video?.uri
    ) {
      // Vertex/Veo response: {generatedSamples: [{video: {uri: "https://..."}}]}
      mediaUrl = data.generatedSamples[0].video.uri
      mediaType = 'video'
    } else if (data.videos && Array.isArray(data.videos) && data.videos[0]) {
      // Vertex/Veo response: {videos: ["https://..."]}
      mediaUrl = data.videos[0]
      mediaType = 'video'
    }

    if (mediaUrl) {
      // Download the actual media file from URL
      const mediaResponse = await fetch(mediaUrl)
      if (!mediaResponse.ok) {
        throw new Error(
          `Failed to download ${mediaType} from ${mediaUrl}: ${mediaResponse.status}`,
        )
      }
      await saveBinaryResponse(mediaResponse, params.output)
      return { saved: params.output, url: mediaUrl, type: mediaType }
    }

    fs.writeFileSync(params.output, JSON.stringify(data, null, 2))
    return data
  }

  return apiHubPost('/run', request)
}

/**
 * Chat completion command
 * @param {object} params - Chat parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} [params.prompt] - Simple prompt (converted to messages)
 * @param {Array} [params.messages] - Full messages array
 * @param {string} [params.system] - System prompt
 * @param {boolean} [params.stream] - Enable streaming
 * @param {number} [params.maxTokens] - Max tokens
 * @param {number} [params.temperature] - Temperature
 * @returns {Promise<object|AsyncGenerator>} Chat response or stream
 */
async function chat(params) {
  let messages = params.messages
  if (!messages && params.prompt) {
    messages = [{ role: 'user', content: params.prompt }]
  }
  if (!messages) {
    throw new Error('Either --prompt or --messages is required')
  }

  const inputs = { messages }
  if (params.system) inputs.system = params.system
  if (params.maxTokens) inputs.max_tokens = params.maxTokens
  if (params.temperature !== undefined) inputs.temperature = params.temperature

  return run({ model: params.model, inputs, stream: params.stream })
}

/**
 * Text-to-speech command
 * @param {object} params - TTS parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} params.text - Text to synthesize
 * @param {string} [params.voiceId] - Voice ID (provider-specific)
 * @param {string} params.output - Output audio file path
 * @returns {Promise<object>} TTS result
 */
async function tts(params) {
  if (!params.text) {
    throw new Error('--text is required for TTS')
  }
  if (!params.output) {
    throw new Error('--output is required for TTS')
  }

  const inputs = {}

  // Provider-specific input mapping
  const [vendor] = params.model.split('/')
  if (vendor === 'elevenlabs') {
    // ElevenLabs uses 'text' and requires voice_id - default to "Rachel"
    inputs.text = params.text
    inputs.voice_id = params.voiceId || 'EXAVITQu4vr4xnSDxMaL'
  } else if (vendor === 'minimax') {
    // MiniMax uses 'text' and 'voice_setting' object
    inputs.text = params.text
    inputs.voice_setting = {
      voice_id: params.voiceId || 'male-qn-qingse',
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
    }
  } else if (vendor === 'openai') {
    // OpenAI TTS uses 'input' and 'voice'
    inputs.input = params.text
    inputs.voice = params.voiceId || 'alloy'
  } else if (vendor === 'replicate') {
    // Replicate XTTS uses 'text' and requires 'speaker' (audio URL for voice cloning)
    inputs.text = params.text
    if (params.speaker) {
      inputs.speaker = params.speaker
    } else if (params.voiceId) {
      inputs.speaker = params.voiceId
    } else {
      // Default speaker sample
      inputs.speaker =
        'https://replicate.delivery/pbxt/Jt79w0xsT64R1JsiJ0LQRL8UcWspg5J4RFrU6YwEKpOT1ukS/male.wav'
    }
  } else if (vendor === 'mm') {
    // MM TTS (qwen3-tts-flash) uses 'text' and optional 'voice'
    inputs.text = params.text
    if (params.voiceId) {
      inputs.voice = params.voiceId
    }
  } else {
    // Default: use 'text'
    inputs.text = params.text
  }

  return run({ model: params.model, inputs, output: params.output })
}

/**
 * Image generation command
 * @param {object} params - Image parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} params.prompt - Image generation prompt
 * @param {string} [params.size] - Image size (e.g., "1024x1024")
 * @param {string} [params.output] - Output file path
 * @returns {Promise<object>} Image generation result
 */
async function image(params) {
  if (!params.prompt) {
    throw new Error('--prompt is required for image generation')
  }

  const [vendor] = params.model.split('/')
  const inputs = {}

  if (vendor === 'vertex') {
    inputs.messages = [{ role: 'user', content: params.prompt }]
  } else if (vendor === 'mm') {
    // MM uses prompt and size in "1024*1536" format
    inputs.prompt = params.prompt
    if (params.size) {
      // Convert "1024x1536" to "1024*1536" if needed
      inputs.size = params.size.replace('x', '*')
    }
  } else {
    inputs.prompt = params.prompt
    if (params.size) inputs.size = params.size
  }

  return run({ model: params.model, inputs, output: params.output })
}

/**
 * Web search command
 * @param {object} params - Search parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} params.query - Search query
 * @returns {Promise<object>} Search results
 */
async function search(params) {
  if (!params.query) {
    throw new Error('--query is required for search')
  }

  const inputs = {}
  const [vendor] = params.model.split('/')

  // Provider-specific input mapping
  if (vendor === 'scrapingdog') {
    inputs.q = params.query
  } else if (vendor === 'perplexity') {
    // Perplexity uses chat-style interface
    inputs.messages = [{ role: 'user', content: params.query }]
  } else {
    inputs.query = params.query
  }

  return run({ model: params.model, inputs })
}

/**
 * Web scraping command
 * @param {object} params - Scrape parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} [params.url] - Single URL to scrape
 * @param {string[]} [params.urls] - Multiple URLs to scrape
 * @returns {Promise<object>} Scrape results
 */
async function scrape(params) {
  if (!params.url && !params.urls) {
    throw new Error('--url or --urls is required for scraping')
  }

  const inputs = {}
  const [vendor] = params.model.split('/')

  if (vendor === 'scrapingdog') {
    inputs.url = params.url
  } else if (vendor === 'firecrawl') {
    if (params.urls) {
      inputs.urls = params.urls
    } else {
      inputs.url = params.url
    }
  } else {
    inputs.url = params.url
  }

  return run({ model: params.model, inputs })
}

/**
 * Video generation command
 * @param {object} params - Video parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} params.prompt - Video generation prompt
 * @param {string} [params.output] - Output file path
 * @returns {Promise<object>} Video generation result
 */
async function video(params) {
  if (!params.prompt) {
    throw new Error('--prompt is required for video generation')
  }

  const [vendor] = params.model.split('/')
  const inputs = {}

  if (vendor === 'vertex') {
    // Vertex/Veo uses instances array format
    inputs.instances = [{ prompt: params.prompt }]
    inputs.parameters = {}
  } else if (vendor === 'mm') {
    // MM video models: t2v (text-to-video), i2v (image-to-video)
    inputs.prompt = params.prompt
    if (params.size) {
      // Convert "1280x720" to "1280*720" if needed
      inputs.size = params.size.replace('x', '*')
    }
    if (params.duration) {
      inputs.duration = parseInt(params.duration)
    }
    if (params.image) {
      // i2v mode: image-to-video
      inputs.image_url = params.image
    }
  } else {
    // MiniMax and others use 'prompt'
    inputs.prompt = params.prompt
  }

  return run({ model: params.model, inputs, output: params.output })
}

/**
 * Music generation command
 * @param {object} params - Music parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} params.prompt - Music description prompt
 * @param {string} [params.duration] - Duration in seconds
 * @param {string} [params.output] - Output file path
 * @returns {Promise<object>} Music generation result
 */
async function music(params) {
  if (!params.prompt) {
    throw new Error('--prompt is required for music generation')
  }

  const inputs = {
    prompt: params.prompt,
  }

  if (params.duration) {
    inputs.duration = parseInt(params.duration)
  }

  return run({ model: params.model, inputs, output: params.output })
}

/**
 * Multimodal understanding command (video/image/audio analysis)
 * @param {object} params - Multimodal parameters
 * @param {string} params.model - Model in "vendor/model" format (e.g., mm/qwen3-vl-plus)
 * @param {string} params.prompt - Text prompt/question about the media
 * @param {string} [params.video] - Video URL to analyze
 * @param {string} [params.image] - Image URL to analyze
 * @param {string} [params.audio] - Audio URL to analyze/transcribe
 * @returns {Promise<object>} Multimodal analysis result
 */
async function multimodal(params) {
  if (!params.prompt) {
    throw new Error('--prompt is required for multimodal')
  }
  if (!params.video && !params.image && !params.audio) {
    throw new Error('At least one of --video, --image, or --audio is required')
  }

  const [vendor] = params.model.split('/')
  const inputs = {}

  if (vendor === 'mm') {
    // MM multimodal models use messages format
    const content = []
    if (params.video) {
      content.push({ video: params.video })
      if (params.fps) {
        content[content.length - 1].fps = parseInt(params.fps)
      }
    }
    if (params.image) {
      content.push({ image: params.image })
    }
    if (params.audio) {
      content.push({ audio: params.audio })
    }
    content.push({ text: params.prompt })

    inputs.input = {
      messages: [{ role: 'user', content }]
    }
  } else {
    // Generic format
    inputs.prompt = params.prompt
    if (params.video) inputs.video_url = params.video
    if (params.image) inputs.image_url = params.image
    if (params.audio) inputs.audio_url = params.audio
  }

  return run({ model: params.model, inputs })
}

/**
 * Gamma presentation command
 * @param {object} params - Gamma parameters
 * @param {string} params.model - Model (gamma/generation)
 * @param {string} params.inputText - Presentation input text
 * @returns {Promise<object>} Gamma generation result
 */
async function gamma(params) {
  if (!params.inputText) {
    throw new Error('--input-text is required for Gamma')
  }

  const inputs = {
    inputText: params.inputText,
    format: params.format || 'presentation',
    textOptions: {
      language: params.language || 'en'
    }
  }
  return run({ model: params.model, inputs })
}

/**
 * Document processing command (Reducto)
 * @param {object} params - Document parameters
 * @param {string} params.model - Model in "reducto/model" format (parse, extract, split, edit)
 * @param {string} params.url - Document URL (PDF, DOCX, etc.)
 * @param {string} [params.schema] - JSON Schema string for extract (e.g. '{"type":"object","properties":{...}}')
 * @param {string} [params.splitDescription] - JSON array of {name, description} for split
 * @param {string} [params.instructions] - JSON string of edit instructions for edit
 * @param {string} [params.settings] - JSON string of additional settings
 * @param {string} [params.output] - Output file path to save results
 * @returns {Promise<object>} Document processing result
 */
async function document(params) {
  if (!params.url) {
    throw new Error('--url is required (document URL)')
  }

  const inputs = { document_url: params.url }
  const model = params.model.split('/')[1] // parse, extract, split, edit

  if (model === 'extract' && params.schema) {
    inputs.instructions = { schema: JSON.parse(params.schema) }
  }
  if (model === 'split' && params.splitDescription) {
    inputs.split_description = JSON.parse(params.splitDescription)
  }
  if (model === 'edit' && params.instructions) {
    inputs.edit_instructions = JSON.parse(params.instructions)
  }
  if (params.settings) {
    inputs.settings = JSON.parse(params.settings)
  }

  return run({ model: params.model, inputs, output: params.output })
}

/**
 * Send SMS verification code (OTP) via Prelude
 * @param {object} params - Verify parameters
 * @param {string} params.phone - Phone number in E.164 format (e.g. "+1234567890")
 * @param {string} [params.ip] - User's IP address for anti-fraud signals
 * @param {string} [params.deviceId] - Device identifier for anti-fraud signals
 * @returns {Promise<object>} Verification result {id, status, method, channels}
 */
async function smsVerify(params) {
  if (!params.phone) {
    throw new Error('--phone is required (E.164 format, e.g. +1234567890)')
  }

  const inputs = {
    target: { type: 'phone_number', value: params.phone },
  }
  if (params.ip || params.deviceId) {
    inputs.signals = {}
    if (params.ip) inputs.signals.ip = params.ip
    if (params.deviceId) inputs.signals.device_id = params.deviceId
  }

  return run({ model: 'prelude/verify-send', inputs })
}

/**
 * Check SMS verification code (OTP) via Prelude
 * @param {object} params - Check parameters
 * @param {string} params.phone - Phone number in E.164 format
 * @param {string} params.code - OTP code received via SMS
 * @returns {Promise<object>} Check result {id, status}
 */
async function smsCheck(params) {
  if (!params.phone) {
    throw new Error('--phone is required (E.164 format, e.g. +1234567890)')
  }
  if (!params.code) {
    throw new Error('--code is required (the OTP code received via SMS)')
  }

  const inputs = {
    target: { type: 'phone_number', value: params.phone },
    code: params.code,
  }

  return run({ model: 'prelude/verify-check', inputs })
}

/**
 * List available models from API Hub
 * @param {object} [params] - List parameters
 * @param {string} [params.type] - Filter by category (chat, tts, image, video, scraping, etc.)
 * @param {string} [params.vendor] - Filter by vendor
 * @returns {Promise<object>} Models list
 */
async function listModels(params = {}) {
  const response = await apiHubGet('/v1/models')
  let models = response.models || []

  // Filter by category/type
  if (params.type) {
    const typeFilter = params.type.toLowerCase()
    models = models.filter(m =>
      m.category?.toLowerCase() === typeFilter ||
      m.type?.toLowerCase() === typeFilter
    )
  }

  // Filter by vendor
  if (params.vendor) {
    const vendorFilter = params.vendor.toLowerCase()
    models = models.filter(m => m.vendor?.toLowerCase() === vendorFilter)
  }

  return { count: models.length, models }
}


// CLI argument parsing
function parseArgs(args) {
  const parsed = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]
      if (value && !value.startsWith('--')) {
        parsed[key] = value
        i++
      } else {
        parsed[key] = true
      }
    } else if (!parsed._command) {
      parsed._command = arg
    }
  }
  return parsed
}

// Main CLI handler
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const command = args._command

  if (!command || args.help) {
    console.log(`
SkillBoss API Hub - Multi-Provider API Gateway

Commands:
  list-models  List available models from API Hub
  run          Generic endpoint access (any model)
  chat         Chat completions (bedrock, openai, anthropic, openrouter, vertex, minimax)
  tts          Text-to-speech (elevenlabs, minimax, openai, mm/qwen3-tts-flash)
  image        Image generation (vertex/gemini, replicate/flux, mm/img)
  multimodal   Video/image/audio understanding (mm/qwen3-vl-plus, mm/qwen3-vl-max)
  search       Web search (scrapingdog, perplexity)
  scrape       Web scraping (scrapingdog, firecrawl)
  video        Video generation (minimax, vertex/veo, mm/t2v, mm/i2v)
  music        Music generation (replicate/elevenlabs, replicate/meta/musicgen)
  document     Document processing (reducto: parse, extract, split, edit)
  gamma        Presentations (gamma)
  sms-verify   Send OTP verification code (prelude)
  sms-check    Check OTP verification code (prelude)
  send-email   Send a single email (aws/ses)
  send-batch   Send batch emails with templates
  version      Check for updates and show current/latest version

Common Options:
  --model        Model in "vendor/model" format (required for most commands)
  --stream       Enable streaming output (chat only)
  --output       Save response to file (tts, image, video)
  --no-fallback  Disable automatic fallback on errors (fallback is enabled by default)

Examples:
  # Generic run
  node api-hub.js run --model "scrapingdog/google_search" --inputs '{"q":"test"}'

  # Chat
  node api-hub.js chat --model "bedrock/claude-4-sonnet" --prompt "Hello"
  node api-hub.js chat --model "openrouter/deepseek/deepseek-r1" --prompt "Hello" --stream

  # TTS
  node api-hub.js tts --model "elevenlabs/eleven_multilingual_v2" --text "Hello" --output /tmp/audio.mp3
  node api-hub.js tts --model "mm/qwen3-tts-flash" --text "Hello" --output /tmp/audio.wav

  # Multimodal (video/image understanding)
  node api-hub.js multimodal --model "mm/qwen3-vl-plus" --video "https://example.com/video.mp4" --prompt "What's happening in this video?"
  node api-hub.js multimodal --model "mm/qwen3-vl-max" --image "https://example.com/image.jpg" --prompt "Describe this image"

  # Image (default: mm/img)
  node api-hub.js image --prompt "A sunset" --output image.png
  node api-hub.js image --model "vertex/gemini-3-pro-image-preview" --prompt "A sunset"
  node api-hub.js image --prompt "A sunset" --size "1024*1536" --output image.png

  # Video (default: mm/t2v for text-to-video, mm/i2v for image-to-video)
  node api-hub.js video --prompt "A cat walking" --duration 5 --output video.mp4
  node api-hub.js video --prompt "Animate this" --image "https://example.com/cat.jpg" --duration 5 --output video.mp4
  node api-hub.js video --model "vertex/veo-3.1-fast-generate-preview" --prompt "A sunset" --output video.mp4

  # Music (default: replicate/elevenlabs/music)
  node api-hub.js music --prompt "upbeat electronic dance track" --output music.mp3
  node api-hub.js music --model "replicate/meta/musicgen" --prompt "calm acoustic guitar" --duration 30

  # Document Processing
  node api-hub.js document --model "reducto/parse" --url "https://example.com/doc.pdf"
  node api-hub.js document --model "reducto/extract" --url "https://example.com/doc.pdf" --schema '{"type":"object","properties":{"title":{"type":"string"}}}'

  # Search & Scrape
  node api-hub.js search --model "scrapingdog/google_search" --query "nodejs"
  node api-hub.js scrape --model "firecrawl/scrape" --url "https://example.com"

  # SMS Verification (OTP)
  node api-hub.js sms-verify --phone "+1234567890"
  node api-hub.js sms-check --phone "+1234567890" --code "123456"

  # Email
  node api-hub.js send-email --to "user@example.com" --subject "Hello" --body "<p>Hi!</p>"

  # List Models
  node api-hub.js list-models
  node api-hub.js list-models --type chat
  node api-hub.js list-models --vendor openai
`)
    process.exit(0)
  }

  try {
    let result

    switch (command) {
      case 'list-models': {
        result = await listModels({
          type: args.type,
          vendor: args.vendor,
        })

        // Group by category for display
        const grouped = {}
        for (const m of result.models) {
          const cat = m.category || 'Other'
          if (!grouped[cat]) grouped[cat] = []
          grouped[cat].push(m)
        }

        console.log(`\nAvailable Models (${result.count} total)\n`)
        for (const [category, models] of Object.entries(grouped).sort()) {
          console.log(`## ${category}`)
          for (const m of models) {
            console.log(`  ${m.id}`)
            console.log(`    ${m.display_name || m.name} - ${m.description || ''}`)
          }
          console.log()
        }
        break
      }

      case 'run': {
        if (!args.model) {
          console.error('Error: --model is required')
          process.exit(1)
        }
        const inputs = args.inputs ? JSON.parse(args.inputs) : {}
        result = await run({
          model: args.model,
          inputs,
          stream: args.stream,
          output: args.output,
          autoFallback: !args['no-fallback'],
        })

        if (args.stream) {
          // Handle streaming output
          for await (const chunk of result) {
            // Extract text content from various response formats
            const text =
              chunk.choices?.[0]?.delta?.content ||
              chunk.delta?.text ||
              chunk.content?.[0]?.text ||
              ''
            if (text) process.stdout.write(text)
          }
          console.log() // Final newline
        } else if (result.saved) {
          console.log(`Saved to: ${result.saved}`)
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'chat': {
        if (!args.model) {
          console.error('Error: --model is required')
          process.exit(1)
        }
        if (!args.prompt && !args.messages) {
          console.error('Error: --prompt or --messages is required')
          process.exit(1)
        }

        result = await chat({
          model: args.model,
          prompt: args.prompt,
          messages: args.messages ? JSON.parse(args.messages) : undefined,
          system: args.system,
          stream: args.stream,
          maxTokens: args['max-tokens']
            ? parseInt(args['max-tokens'])
            : undefined,
          temperature: args.temperature
            ? parseFloat(args.temperature)
            : undefined,
        })

        if (args.stream) {
          for await (const chunk of result) {
            const text =
              chunk.choices?.[0]?.delta?.content ||
              chunk.delta?.text ||
              chunk.content?.[0]?.text ||
              ''
            if (text) process.stdout.write(text)
          }
          console.log()
        } else {
          // Extract text from response
          const text =
            result.choices?.[0]?.message?.content ||
            result.content?.[0]?.text ||
            result.message?.content ||
            JSON.stringify(result, null, 2)
          console.log(text)
        }
        break
      }

      case 'tts': {
        if (!args.model || !args.text || !args.output) {
          console.error('Error: --model, --text, and --output are required')
          process.exit(1)
        }
        result = await tts({
          model: args.model,
          text: args.text,
          voiceId: args['voice-id'],
          output: args.output,
        })
        console.log(`Audio saved to: ${args.output}`)
        break
      }

      case 'image': {
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        const imageModel = args.model || 'mm/img'
        result = await image({
          model: imageModel,
          prompt: args.prompt,
          size: args.size,
          output: args.output,
        })
        if (args.output) {
          console.log(`Image saved to: ${args.output}`)
          if (result.url) {
            console.log(`URL: ${result.url}`)
          }
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'search': {
        if (!args.model || !args.query) {
          console.error('Error: --model and --query are required')
          process.exit(1)
        }
        result = await search({
          model: args.model,
          query: args.query,
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'scrape': {
        if (!args.model || (!args.url && !args.urls)) {
          console.error('Error: --model and --url (or --urls) are required')
          process.exit(1)
        }
        result = await scrape({
          model: args.model,
          url: args.url,
          urls: args.urls ? JSON.parse(args.urls) : undefined,
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'video': {
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        // Default model: use mm/i2v if --image provided, otherwise mm/t2v
        const videoModel = args.model || (args.image ? 'mm/i2v' : 'mm/t2v')
        result = await video({
          model: videoModel,
          prompt: args.prompt,
          size: args.size,
          duration: args.duration,
          image: args.image,
          output: args.output,
        })
        if (args.output) {
          console.log(`Video saved to: ${args.output}`)
          if (result.url) {
            console.log(`URL: ${result.url}`)
          }
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'music': {
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        const musicModel = args.model || 'replicate/elevenlabs/music'
        result = await music({
          model: musicModel,
          prompt: args.prompt,
          duration: args.duration,
          output: args.output,
        })
        if (args.output) {
          console.log(`Music saved to: ${args.output}`)
          if (result.url) {
            console.log(`URL: ${result.url}`)
          }
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'multimodal': {
        if (!args.model) {
          console.error('Error: --model is required')
          process.exit(1)
        }
        if (!args.prompt) {
          console.error('Error: --prompt is required')
          process.exit(1)
        }
        if (!args.video && !args.image && !args.audio) {
          console.error('Error: At least one of --video, --image, or --audio is required')
          process.exit(1)
        }
        result = await multimodal({
          model: args.model,
          prompt: args.prompt,
          video: args.video,
          image: args.image,
          audio: args.audio,
          fps: args.fps,
        })

        // Extract text from response
        const text =
          result.output?.choices?.[0]?.message?.content?.[0]?.text ||
          result.text ||
          JSON.stringify(result, null, 2)
        console.log(text)
        break
      }

      case 'gamma': {
        if (!args.model || !args['input-text']) {
          console.error('Error: --model and --input-text are required')
          process.exit(1)
        }
        result = await gamma({
          model: args.model,
          inputText: args['input-text'],
        })
        console.log(JSON.stringify(result, null, 2))
        break
      }

      case 'document': {
        if (!args.model || !args.url) {
          console.error('Error: --model and --url are required')
          process.exit(1)
        }
        result = await document({
          model: args.model,
          url: args.url,
          schema: args.schema,
          splitDescription: args['split-description'],
          instructions: args.instructions,
          settings: args.settings,
          output: args.output,
        })
        if (args.output) {
          console.log(`Saved to: ${args.output}`)
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        break
      }

      case 'sms-verify': {
        if (!args.phone) {
          console.error('Error: --phone is required (E.164 format, e.g. +1234567890)')
          process.exit(1)
        }
        result = await smsVerify({
          phone: args.phone,
          ip: args.ip,
          deviceId: args['device-id'],
        })
        console.log(`\nVerification sent to: ${args.phone}`)
        console.log(`Status: ${result.status}`)
        console.log(`Verification ID: ${result.id}`)
        if (result.channels) {
          console.log(`Channel: ${result.channels.join(', ')}`)
        }
        break
      }

      case 'sms-check': {
        if (!args.phone || !args.code) {
          console.error('Error: --phone and --code are required')
          process.exit(1)
        }
        result = await smsCheck({
          phone: args.phone,
          code: args.code,
        })
        console.log(`\nVerification check for: ${args.phone}`)
        console.log(`Status: ${result.status}`)
        if (result.status === 'success') {
          console.log('Phone number verified successfully!')
        } else {
          console.log('Verification failed. Code may be incorrect or expired.')
        }
        break
      }

      case 'send-email': {
        // Support both --to (new) and --receivers (legacy)
        const toArg = args.to || args.receivers
        if (!toArg || !args.subject || !args.body) {
          console.error(
            'Error: --to, --subject, and --body are required for send-email',
          )
          process.exit(1)
        }

        const receivers = toArg.split(',').map((e) => e.trim())
        result = await sendEmail({
          subject: args.subject,
          bodyHtml: args.body,
          receivers,
          replyTo: args['reply-to']?.split(',').map((e) => e.trim()),
          projectId: args['project-id'],
        })

        console.log('\nEmail sent successfully!')
        console.log(`To: ${receivers.join(', ')}`)
        console.log(`Subject: ${args.subject}`)
        break
      }

      case 'send-batch': {
        if (!args.receivers || !args.subject || !args.body) {
          console.error(
            'Error: --receivers, --subject, and --body are required for send-batch',
          )
          process.exit(1)
        }

        const receivers = JSON.parse(args.receivers)
        result = await sendBatchEmails({
          subject: args.subject,
          bodyHtml: args.body,
          receivers,
          replyTo: args['reply-to']?.split(',').map((e) => e.trim()),
          projectId: args['project-id'],
        })

        console.log('\nBatch emails sent!')
        console.log(`Recipients: ${receivers.length}`)
        break
      }

      case 'version': {
        const localVersion = config.version || 'unknown'
        console.log(`Current version: ${localVersion}`)

        try {
          const res = await fetchWithRetry('https://www.skillboss.co/api/skills/version')
          if (!res.ok) {
            console.log('\nCould not check latest version (server error)')
            break
          }
          const data = await res.json()
          console.log(`Latest version: ${data.version}`)

          if (localVersion !== data.version && localVersion !== 'unknown') {
            console.log('\n*** Update available! ***')
            if (data.changelog) {
              console.log(`\nChangelog:\n${data.changelog}`)
            }
            console.log('\nTo update, run: bash ./skillboss/install/update.sh')
          } else if (localVersion === 'unknown') {
            console.log('\nLocal version unknown. Consider updating to ensure you have the latest features.')
            console.log('To update, run: bash ./skillboss/install/update.sh')
          } else {
            console.log('\nYou are on the latest version.')
          }
        } catch (e) {
          console.log('\nCould not check latest version (network error)')
        }
        break
      }

      default:
        console.error(`Unknown command: ${command}`)
        console.error('Run with --help to see available commands')
        process.exit(1)
    }

    if (process.env.DEBUG && result) {
      console.log('\nDebug Response:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('\nError:', error.message)
    process.exit(1)
  }
}

// Run CLI if executed directly
if (process.argv[1]?.endsWith('api-hub.js')) {
  main()
}

// Export for module usage
module.exports = {
  // High-level commands
  run,
  chat,
  tts,
  image,
  multimodal,
  search,
  scrape,
  video,
  music,
  document,
  gamma,
  listModels,

  // SMS/Verify
  smsVerify,
  smsCheck,

  // Email
  sendEmail,
  sendBatchEmails,
}
