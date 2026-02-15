const { apiHubGet } = require('../lib/client')

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

module.exports = { listModels }
