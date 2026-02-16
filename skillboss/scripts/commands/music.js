const { run } = require('./run')

/**
 * Music generation command
 * @param {object} params - Music parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} params.prompt - Music generation prompt
 * @param {number} [params.duration] - Duration in seconds
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

module.exports = { music }
