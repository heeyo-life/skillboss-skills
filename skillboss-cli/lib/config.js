'use strict'

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const CONFIG_DIR = path.join(os.homedir(), '.config', 'skillboss')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

function readConfig() {
  ensureConfigDir()
  if (!fs.existsSync(CONFIG_FILE)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function writeConfig(config) {
  ensureConfigDir()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

function getApiKey() {
  const config = readConfig()
  return config.api_key || process.env.SKILLBOSS_API_KEY || ''
}

function setApiKey(key) {
  const config = readConfig()
  config.api_key = key
  config.saved_at = new Date().toISOString()
  writeConfig(config)
}

module.exports = { readConfig, writeConfig, getApiKey, setApiKey, CONFIG_FILE }
