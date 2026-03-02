const fs = require('fs')
const path = require('path')
const { apiHubPost } = require('../lib/client')
const { fetchWithRetry } = require('../lib/fetch-retry')
const { config } = require('../lib/client')

const API_HUB_API_KEY = config.apiKey
const API_HUB_BASE_URL = config.baseUrl || 'https://api.heybossai.com/v1'

/**
 * Build inputs object from CLI flags based on task type
 */
function _buildInputs(type, flags) {
  const inputs = {}

  switch (type) {
    case 'chat':
      if (flags.prompt) {
        inputs.messages = [{ role: 'user', content: flags.prompt }]
      }
      if (flags.system) {
        inputs.system = flags.system
      }
      break

    case 'image':
      if (flags.prompt) inputs.prompt = flags.prompt
      if (flags.size) inputs.size = flags.size
      break

    case 'tts':
      if (flags.text) {
        inputs.text = flags.text
        inputs.input = flags.text  // OpenAI TTS expects 'input', others expect 'text'
      }
      if (flags['voice-id']) {
        inputs.voice_id = flags['voice-id']
        inputs.voice = flags['voice-id']  // OpenAI TTS expects 'voice'
      } else {
        inputs.voice = 'alloy'  // OpenAI TTS requires voice, default to alloy
      }
      break

    case 'stt': {
      if (flags.file) {
        const filePath = path.resolve(flags.file)
        const fileData = fs.readFileSync(filePath)
        inputs.audio_data = fileData.toString('base64')
        inputs.filename = path.basename(filePath)
      }
      if (flags.language) inputs.language = flags.language
      break
    }

    case 'music':
      if (flags.prompt) inputs.prompt = flags.prompt
      if (flags.duration) inputs.duration = parseInt(flags.duration)
      break

    case 'video':
      if (flags.prompt) inputs.prompt = flags.prompt
      if (flags.image) inputs.image = flags.image
      if (flags.duration) inputs.duration = parseInt(flags.duration)
      break

    default:
      if (flags.prompt) inputs.prompt = flags.prompt
      if (flags.text) inputs.text = flags.text
      break
  }

  return inputs
}

/**
 * Download a URL to a local file
 */
async function _downloadToFile(url, outputPath) {
  const response = await fetchWithRetry(url)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(outputPath, buffer)
}

/**
 * Extract a media URL from various response formats
 */
function _extractMediaUrl(result) {
  return (
    result.image_url ||
    result.video_url ||
    result.audio_url ||
    result.url ||
    result.data?.[0] ||
    result.generated_images?.[0] ||
    result.generatedSamples?.[0]?.video?.uri ||
    result.videos?.[0] ||
    null
  )
}

/**
 * Pilot command — smart model selector and executor
 *
 * Modes:
 *   guide     — no args, returns overview
 *   discover  — --discover [--keyword X]
 *   recommend — --type X [--prefer X] [--limit N]
 *   execute   — --type X --prompt/--text/--file (auto-select + run)
 *   chain     — --chain '[...]'
 */
async function pilot(flags) {
  // Determine mode from flags
  const hasExecuteInput = flags.prompt || flags.text || flags.file
  const isChain = !!flags.chain
  const isDiscover = !!flags.discover
  const isRecommend = flags.type && !hasExecuteInput && !isChain
  const isExecute = flags.type && hasExecuteInput
  const isGuide = !isDiscover && !isRecommend && !isExecute && !isChain

  // Build request body
  const body = {}

  if (isGuide) {
    // Empty body → guide mode
  } else if (isDiscover) {
    body.discover = true
    if (flags.keyword) body.keyword = flags.keyword
  } else if (isChain) {
    body.chain = typeof flags.chain === 'string' ? JSON.parse(flags.chain) : flags.chain
  } else if (isExecute) {
    body.type = flags.type
    if (flags.prefer) body.prefer = flags.prefer
    if (flags.capability) body.capability = flags.capability
    body.inputs = _buildInputs(flags.type, flags)
    if (flags['include-docs'] !== undefined) {
      body.include_docs = flags['include-docs'] === true || flags['include-docs'] === 'true'
    }
  } else if (isRecommend) {
    body.type = flags.type
    if (flags.prefer) body.prefer = flags.prefer
    if (flags.limit) body.limit = parseInt(flags.limit)
    if (flags.capability) body.capability = flags.capability
    if (flags['include-docs'] !== undefined) {
      body.include_docs = flags['include-docs'] === true || flags['include-docs'] === 'true'
    }
  }

  // Call Pilot API
  const result = await apiHubPost('/pilot', body)

  // Determine response mode for caller
  if (isGuide) {
    return { mode: 'guide', data: result }
  } else if (isDiscover) {
    return { mode: 'discover', data: result }
  } else if (isChain) {
    return { mode: 'chain', data: result }
  } else if (isExecute) {
    // Handle execute result — may need to download output
    // Pilot API nests the actual vendor result inside result.result
    const inner = result.result || result
    const output = flags.output
    const mediaUrl = _extractMediaUrl(inner)

    if (output && mediaUrl) {
      await _downloadToFile(mediaUrl, output)
      return { mode: 'execute', data: result, saved: output }
    }

    // TTS binary — check if response has binary indicator
    if (output && (inner.audio_base64 || result.audio_base64)) {
      const buffer = Buffer.from(inner.audio_base64 || result.audio_base64, 'base64')
      fs.writeFileSync(output, buffer)
      return { mode: 'execute', data: result, saved: output }
    }

    return { mode: 'execute', data: result }
  } else {
    return { mode: 'recommend', data: result }
  }
}

module.exports = { pilot }
