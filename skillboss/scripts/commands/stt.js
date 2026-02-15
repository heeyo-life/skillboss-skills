const fs = require('fs')
const path = require('path')
const { run } = require('./run')

/**
 * Speech-to-text command
 * @param {object} params - STT parameters
 * @param {string} params.file - Local audio file path
 * @param {string} [params.model] - Model (default: openai/whisper-1)
 * @param {string} [params.prompt] - Optional prompt to guide transcription style
 * @param {string} [params.language] - Optional language code (e.g., "en")
 * @param {string} [params.output] - Optional output file path for transcript
 * @returns {Promise<object>} STT result with transcribed text
 */
async function stt(params) {
  if (!params.file) {
    throw new Error('--file is required for STT (local audio file path)')
  }

  const filePath = path.resolve(params.file)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`)
  }

  const audioData = fs.readFileSync(filePath).toString('base64')
  const filename = path.basename(filePath)

  const inputs = {
    audio_data: audioData,
    filename,
  }
  if (params.prompt) inputs.prompt = params.prompt
  if (params.language) inputs.language = params.language

  const model = params.model || 'openai/whisper-1'
  const result = await run({ model, inputs })

  const text = result.text || JSON.stringify(result)

  if (params.output) {
    fs.writeFileSync(params.output, text)
  }

  return { text, ...(params.output ? { saved: params.output } : {}) }
}

module.exports = { stt }
