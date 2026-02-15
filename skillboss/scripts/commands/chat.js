const { run } = require('./run')

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

module.exports = { chat }
