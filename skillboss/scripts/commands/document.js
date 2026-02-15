const { run } = require('./run')

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

module.exports = { gamma, document }
