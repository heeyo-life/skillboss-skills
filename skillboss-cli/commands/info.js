'use strict'

const { request } = require('../lib/api')

async function info(args) {
  const slug = args[0]
  if (!slug) {
    console.error('Usage: skillboss info <slug>')
    console.error('Example: skillboss info @alice/url-summarizer')
    process.exit(1)
  }

  // Use the public skill detail endpoint
  const skill = await request('GET', `/v1/skills/${slug}`)

  console.log(`\n${skill.slug || slug} - ${skill.name}`)
  console.log('='.repeat(50))

  if (skill.what_i_can_do) {
    console.log(`\nWhat I do: ${skill.what_i_can_do}`)
  }
  if (skill.when_to_use_me) {
    console.log(`When to use: ${skill.when_to_use_me}`)
  }
  if (skill.limitations) {
    console.log(`Limitations: ${skill.limitations}`)
  }
  if (skill.data_handling) {
    console.log(`Data handling: ${skill.data_handling}`)
  }

  const pricing = skill.pricing || {}
  console.log(`\nPricing: $${pricing.price || 0}/call`)
  console.log(`Version: ${skill.version || '1.0.0'}`)

  const stats = skill.stats || {}
  if (stats.invocations) {
    console.log(
      `Stats: ${stats.invocations} invocations | ${(stats.avg_latency_ms / 1000).toFixed(1)}s avg`,
    )
  }

  if (skill.tags && skill.tags.length > 0) {
    console.log(`Tags: ${skill.tags.join(', ')}`)
  }
  console.log('')
}

module.exports = info
