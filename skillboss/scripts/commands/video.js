const { run } = require('./run')

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

module.exports = { video, multimodal }
