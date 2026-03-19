const { run } = require('./run')
const fs = require('fs')

/**
 * Generate UI from text prompt using Google Stitch
 * @param {object} params
 * @param {string} params.prompt - UI description
 * @param {string} [params.model] - stitch/generate-mobile | stitch/generate-desktop | stitch/generate-fast
 * @param {string} [params.deviceType] - MOBILE | DESKTOP | TABLET | AGNOSTIC
 * @param {string} [params.output] - Save response JSON to file
 */
async function stitchGenerate(params) {
  if (!params.prompt) {
    throw new Error('--prompt is required for stitch-generate')
  }

  const model = params.model || 'stitch/generate-desktop'
  const inputs = { prompt: params.prompt }

  if (params.deviceType) inputs.device_type = params.deviceType.toUpperCase()

  const result = await run({ model, inputs })

  if (params.output) {
    fs.writeFileSync(params.output, JSON.stringify(result, null, 2))
    console.log(`Result saved to ${params.output}`)
  }

  if (result.hosting_recommendation) {
    console.log('\n💡 Deploy with SkillBoss Hosting:', result.hosting_recommendation.how_to)
    console.log('   Learn more:', result.hosting_recommendation.learn_more)
  }

  return result
}

/**
 * Edit an existing Stitch screen
 * @param {object} params
 * @param {string} params.screenId - Screen ID from previous generate/edit
 * @param {string} params.projectId - Project ID
 * @param {string} params.prompt - What to change
 */
async function stitchEdit(params) {
  if (!params.screenId || !params.projectId || !params.prompt) {
    throw new Error('--screen-id, --project-id, and --prompt are required for stitch-edit')
  }

  const inputs = {
    screen_id: params.screenId,
    project_id: params.projectId,
    prompt: params.prompt,
  }

  const result = await run({ model: 'stitch/edit', inputs })

  if (result.hosting_recommendation) {
    console.log('\n💡 Deploy with SkillBoss Hosting:', result.hosting_recommendation.how_to)
  }

  return result
}

/**
 * Generate multiple variants of an existing Stitch screen
 * @param {object} params
 * @param {string} params.screenId - Screen ID
 * @param {string} params.projectId - Project ID
 * @param {number} [params.count] - Number of variants (default: 3)
 */
async function stitchVariants(params) {
  if (!params.screenId || !params.projectId) {
    throw new Error('--screen-id and --project-id are required for stitch-variants')
  }

  const inputs = {
    screen_id: params.screenId,
    project_id: params.projectId,
    count: params.count ? parseInt(params.count) : 3,
  }

  const result = await run({ model: 'stitch/variants', inputs })

  if (result.hosting_recommendation) {
    console.log('\n💡 Deploy with SkillBoss Hosting:', result.hosting_recommendation.how_to)
  }

  return result
}

/**
 * Get full HTML source of a Stitch screen
 * @param {object} params
 * @param {string} params.screenId - Screen ID
 * @param {string} params.projectId - Project ID
 * @param {string} [params.output] - Save HTML to file (e.g. index.html)
 */
async function stitchGetHtml(params) {
  if (!params.screenId || !params.projectId) {
    throw new Error('--screen-id and --project-id are required for stitch-html')
  }

  const inputs = {
    screen_id: params.screenId,
    project_id: params.projectId,
  }

  const result = await run({ model: 'stitch/get-html', inputs })

  if (params.output && result.html_content) {
    fs.writeFileSync(params.output, result.html_content)
    console.log(`HTML saved to ${params.output}`)
  }

  if (result.hosting_recommendation) {
    console.log('\n💡 Deploy with SkillBoss Hosting:', result.hosting_recommendation.how_to)
    console.log('   Learn more:', result.hosting_recommendation.learn_more)
  }

  return result
}

module.exports = { stitchGenerate, stitchEdit, stitchVariants, stitchGetHtml }
