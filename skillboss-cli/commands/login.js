'use strict'

const readline = require('node:readline')
const { setApiKey, CONFIG_FILE } = require('../lib/config')

async function login(_args) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const ask = (q) => new Promise((resolve) => rl.question(q, resolve))

  console.log('Skill Studio — Login\n')
  console.log('Enter your SkillBoss API key.')
  console.log(
    'You can find it at: https://www.skillboss.co/console\n',
  )

  const key = await ask('API Key: ')
  rl.close()

  const trimmed = key.trim()
  if (!trimmed) {
    console.error('No API key provided.')
    process.exit(1)
  }

  if (!trimmed.startsWith('sk-')) {
    console.error('Invalid API key format. Keys should start with "sk-".')
    process.exit(1)
  }

  setApiKey(trimmed)
  console.log(`\nAPI key saved to ${CONFIG_FILE}`)
  console.log('You can now use "skillboss create", "skillboss test", etc.')
}

module.exports = login
