const { apiHubGet, apiHubPost, apiHubStream } = require('../lib/client')

/**
 * Search community skills on the marketplace.
 * @param {object} params
 * @param {string} [params.query] - Search query
 * @param {string} [params.category] - Filter by category
 * @param {string} [params.format] - "json" (default) or "markdown"
 * @param {number} [params.limit] - Max results (default 20)
 * @param {number} [params.offset] - Pagination offset
 * @returns {Promise<object|string>}
 */
async function skillsSearch(params) {
  const qs = new URLSearchParams()
  if (params.query) qs.set('q', params.query)
  if (params.category) qs.set('category', params.category)
  if (params.format) qs.set('format', params.format)
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.offset) qs.set('offset', String(params.offset))

  const endpoint = `/skills/search${qs.toString() ? '?' + qs.toString() : ''}`
  return apiHubGet(endpoint)
}

/**
 * Get details of a single community skill.
 * @param {object} params
 * @param {string} params.slug - Skill slug (e.g. @alice/url-summarizer)
 * @param {string} [params.format] - "json" (default) or "markdown"
 * @returns {Promise<object|string>}
 */
async function skillsDetail(params) {
  const qs = new URLSearchParams()
  if (params.format) qs.set('format', params.format)

  const slug = params.slug.startsWith('@') ? params.slug.slice(1) : params.slug
  const endpoint = `/skills/${encodeURIComponent(slug)}${qs.toString() ? '?' + qs.toString() : ''}`
  return apiHubGet(endpoint)
}

/**
 * Run a community skill via the /run endpoint (model="skill").
 * @param {object} params
 * @param {string} params.slug - Skill slug
 * @param {string} params.input - User input text
 * @param {boolean} [params.stream] - Stream output (default true)
 * @returns {Promise<object|AsyncGenerator>}
 */
async function skillsRun(params) {
  const request = {
    model: 'skill',
    inputs: {
      name: params.slug,
      parts: [{ type: 'text', text: params.input }],
      stream: params.stream !== false,
    },
  }

  if (params.stream !== false) {
    return apiHubStream('/run', request)
  }

  return apiHubPost('/run', request)
}

module.exports = { skillsSearch, skillsDetail, skillsRun }
