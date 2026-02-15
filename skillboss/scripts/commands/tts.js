const { run } = require('./run')

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

module.exports = { tts }
