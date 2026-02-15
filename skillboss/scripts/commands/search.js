const { run } = require('./run')

/**
 * Web search command
 * @param {object} params - Search parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} params.query - Search query
 * @returns {Promise<object>} Search results
 */
async function search(params) {
  if (!params.query) {
    throw new Error('--query is required for search')
  }

  const inputs = {}
  const [vendor] = params.model.split('/')

  // Provider-specific input mapping
  if (vendor === 'scrapingdog') {
    inputs.q = params.query
  } else if (vendor === 'perplexity') {
    // Perplexity uses chat-style interface
    inputs.messages = [{ role: 'user', content: params.query }]
  } else {
    inputs.query = params.query
  }

  return run({ model: params.model, inputs })
}

/**
 * Web scraping command
 * @param {object} params - Scrape parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {string} [params.url] - Single URL to scrape
 * @param {string[]} [params.urls] - Multiple URLs to scrape
 * @returns {Promise<object>} Scrape results
 */
async function scrape(params) {
  if (!params.url && !params.urls) {
    throw new Error('--url or --urls is required for scraping')
  }

  const inputs = {}
  const [vendor] = params.model.split('/')

  if (vendor === 'scrapingdog') {
    inputs.url = params.url
  } else if (vendor === 'firecrawl') {
    if (params.urls) {
      inputs.urls = params.urls
    } else {
      inputs.url = params.url
    }
  } else {
    inputs.url = params.url
  }

  return run({ model: params.model, inputs })
}

/**
 * Linkup structured web search
 * @param {object} params - Linkup search parameters
 * @param {string} params.query - Search query
 * @param {string} [params.outputType] - "searchResults" | "sourcedAnswer" | "structured" (default: "searchResults")
 * @param {string} [params.depth] - "standard" | "deep" (default: "standard")
 * @param {string} [params.structuredOutputSchema] - JSON schema string for structured mode
 * @param {string[]} [params.includeDomains] - Only search these domains
 * @param {string[]} [params.excludeDomains] - Exclude these domains
 * @param {string} [params.fromDate] - Start date filter (YYYY-MM-DD)
 * @param {string} [params.toDate] - End date filter (YYYY-MM-DD)
 * @param {number} [params.maxResults] - Max results to return
 * @param {boolean} [params.includeImages] - Include images in results
 * @returns {Promise<object>} Search results in format matching outputType
 */
async function linkupSearch(params) {
  if (!params.query) {
    throw new Error('--query is required for linkup-search')
  }

  const inputs = {
    q: params.query,
    depth: params.depth || 'standard',
    outputType: params.outputType || 'searchResults',
  }

  if (params.structuredOutputSchema) inputs.structuredOutputSchema = params.structuredOutputSchema
  if (params.includeDomains) inputs.includeDomains = params.includeDomains
  if (params.excludeDomains) inputs.excludeDomains = params.excludeDomains
  if (params.fromDate) inputs.fromDate = params.fromDate
  if (params.toDate) inputs.toDate = params.toDate
  if (params.maxResults) inputs.maxResults = params.maxResults
  if (params.includeImages !== undefined) inputs.includeImages = params.includeImages

  const model = params.depth === 'deep' ? 'linkup/search-deep' : 'linkup/search'
  return run({ model, inputs })
}

/**
 * Linkup URL-to-markdown fetcher
 * @param {object} params - Linkup fetch parameters
 * @param {string} params.url - URL to fetch and convert to markdown
 * @param {boolean} [params.renderJs] - Render JavaScript before extracting (default: false)
 * @param {boolean} [params.includeImages] - Include images in output (default: false)
 * @param {boolean} [params.includeRawHtml] - Include raw HTML in response (default: false)
 * @returns {Promise<object>} { content, title, url }
 */
async function linkupFetch(params) {
  if (!params.url) {
    throw new Error('--url is required for linkup-fetch')
  }

  const inputs = {
    url: params.url,
    renderJs: params.renderJs || false,
    includeImages: params.includeImages || false,
    includeRawHtml: params.includeRawHtml || false,
  }

  return run({ model: 'linkup/fetch', inputs })
}

module.exports = { search, scrape, linkupSearch, linkupFetch }
