#!/usr/bin/env node

'use strict'

const COMMANDS = {
  login: '../commands/login.js',
  create: '../commands/create.js',
  test: '../commands/test.js',
  publish: '../commands/publish.js',
  list: '../commands/list.js',
  info: '../commands/info.js',
  unpublish: '../commands/unpublish.js',
  pricing: '../commands/pricing.js',
  'preview-public': '../commands/preview-public.js',
}

const HELP = `
skillboss — Create, test, and publish SkillBoss skills

Usage:
  skillboss <command> [options]

Commands:
  login                        Save your API key
  create <name>                Create a new skill from template
  test <name> --input <text>   Test a skill in E2B sandbox
  publish <name>               Publish a skill to the marketplace
  list                         List your skills
  info <slug>                  Show skill details
  unpublish <slug>             Unpublish a skill
  pricing <slug> --set <price> Update skill pricing
  preview-public <name>        Preview auto-generated public description

Options:
  --help, -h    Show help
  --version     Show version

Examples:
  skillboss login
  skillboss create my-skill
  skillboss test my-skill --input "Summarize https://example.com"
  skillboss publish my-skill --price 0.005 --visibility public
  skillboss list
  skillboss info @alice/url-summarizer
`

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP)
    process.exit(0)
  }

  if (command === '--version') {
    const pkg = require('../package.json')
    console.log(`skillboss v${pkg.version}`)
    process.exit(0)
  }

  const modulePath = COMMANDS[command]
  if (!modulePath) {
    console.error(`Unknown command: ${command}`)
    console.error('Run "skillboss --help" for usage.')
    process.exit(1)
  }

  try {
    const handler = require(modulePath)
    await handler(args.slice(1))
  } catch (err) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }
}

main()
