'use strict'

const readline = require('node:readline')
const { request } = require('../lib/api')

async function unpublish(args) {
  const slug = args[0]
  if (!slug) {
    console.error('Usage: skillboss unpublish <slug>')
    console.error('Example: skillboss unpublish @alice/my-skill')
    process.exit(1)
  }

  // Find the skill by listing own skills and matching slug
  const data = await request('GET', '/v1/studio/skills')
  const skills = data.skills || []
  const skill = skills.find((s) => s.slug === slug)

  if (!skill) {
    console.error(`Skill "${slug}" not found in your skills.`)
    process.exit(1)
  }

  if (skill.status !== 'active') {
    console.log(`Skill "${slug}" is already unpublished (status: ${skill.status}).`)
    return
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const answer = await new Promise((resolve) =>
    rl.question(`Unpublish "${slug}"? This will make it private. (y/n) `, resolve),
  )
  rl.close()

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('Cancelled.')
    return
  }

  await request('DELETE', `/v1/studio/skills/${skill.id}`)
  console.log(`Unpublished: ${slug}`)
}

module.exports = unpublish
