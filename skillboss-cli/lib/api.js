'use strict'

const https = require('node:https')
const http = require('node:http')
const { URL } = require('node:url')
const { getApiKey } = require('./config')

const BASE_URL = process.env.SKILLBOSS_API_URL || 'https://api.heybossai.com'

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey()
    if (!apiKey) {
      reject(new Error('No API key configured. Run "skillboss login" first.'))
      return
    }

    const url = new URL(path, BASE_URL)
    const isHttps = url.protocol === 'https:'
    const transport = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'skillboss-cli/0.1.0',
      },
    }

    const req = transport.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode >= 400) {
            const msg =
              parsed.detail || parsed.error || `HTTP ${res.statusCode}`
            reject(new Error(msg))
          } else {
            resolve(parsed)
          }
        } catch {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`))
          } else {
            resolve(data)
          }
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(120000, () => {
      req.destroy(new Error('Request timed out'))
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

function streamRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey()
    if (!apiKey) {
      reject(new Error('No API key configured. Run "skillboss login" first.'))
      return
    }

    const url = new URL(path, BASE_URL)
    const isHttps = url.protocol === 'https:'
    const transport = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'skillboss-cli/0.1.0',
      },
    }

    const req = transport.request(options, (res) => {
      resolve(res)
    })

    req.on('error', reject)
    req.setTimeout(600000, () => {
      req.destroy(new Error('Request timed out'))
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

module.exports = { request, streamRequest, BASE_URL }
