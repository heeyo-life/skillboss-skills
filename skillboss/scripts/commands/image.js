const { run } = require('./run')

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
 * Image upscale command (FAL creative-upscaler)
 * @param {object} params - Upscale parameters
 * @param {string} params.imageUrl - URL of image to upscale
 * @param {number} [params.scale] - Upscale factor: 2 or 4 (default: 2)
 * @param {string} [params.outputFormat] - "png" or "jpeg" (default: "png")
 * @param {string} [params.output] - Output file path
 * @returns {Promise<object>} Upscale result {image_url, images}
 */
async function upscale(params) {
  if (!params.imageUrl) {
    throw new Error('--image-url is required for upscale')
  }

  const inputs = {
    image_url: params.imageUrl,
    scale: params.scale || 2,
    output_format: params.outputFormat || 'png',
  }

  return run({ model: 'fal/upscale', inputs, output: params.output })
}

/**
 * Image-to-image transformation command (FAL FLUX dev)
 * @param {object} params - img2img parameters
 * @param {string} params.imageUrl - URL of source image
 * @param {string} params.prompt - Transformation description
 * @param {number} [params.strength] - Transform strength 0.0-1.0 (default: 0.75)
 * @param {string} [params.imageSize] - Size preset: square_hd, square, portrait_4_3, landscape_16_9, etc. (default: square_hd)
 * @param {string} [params.outputFormat] - "jpeg" or "png" (default: "jpeg")
 * @param {number} [params.numImages] - Number of images 1-4 (default: 1)
 * @param {string} [params.output] - Output file path
 * @returns {Promise<object>} img2img result {image_url, images}
 */
async function img2img(params) {
  if (!params.imageUrl) {
    throw new Error('--image-url is required for img2img')
  }
  if (!params.prompt) {
    throw new Error('--prompt is required for img2img')
  }

  const inputs = {
    image_url: params.imageUrl,
    prompt: params.prompt,
    strength: params.strength || 0.75,
    image_size: params.imageSize || 'square_hd',
    output_format: params.outputFormat || 'jpeg',
    num_images: params.numImages || 1,
  }

  return run({ model: 'fal/img2img', inputs, output: params.output })
}

module.exports = { image, upscale, img2img }
