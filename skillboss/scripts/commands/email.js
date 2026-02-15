const { apiHubPost } = require('../lib/client')

/**
 * Sends a single email using AWS SES via API Hub
 * Sender is automatically determined from user lookup (name@name.skillboss.live)
 * @param {object} params - Email parameters
 * @param {string} params.subject - Email subject line
 * @param {string} params.bodyHtml - Email body in HTML format
 * @param {string[]} params.receivers - Array of recipient email addresses
 * @param {string[]} [params.replyTo] - Reply-to email addresses
 * @param {string} [params.projectId] - Optional project identifier
 * @returns {Promise<object>} Email send status
 */
async function sendEmail(params) {
  const data = {
    title: params.subject,
    body_html: params.bodyHtml,
    receivers: params.receivers,
    project_id: params.projectId,
  }
  if (params.replyTo) data.reply_to = params.replyTo

  return apiHubPost('/send-email', data)
}

/**
 * Sends batch emails with template variables using AWS SES via API Hub
 * Supports {{variable}} template syntax in subject and body
 * Sender is automatically determined from user lookup (name@name.skillboss.live)
 * @param {object} params - Batch email parameters
 * @param {string} params.subject - Email subject line with template variables
 * @param {string} params.bodyHtml - Email body in HTML format with template variables
 * @param {Array<{email: string, variables: object}>} params.receivers - Recipients with template variables
 * @param {string[]} [params.replyTo] - Reply-to email addresses
 * @param {string} [params.projectId] - Optional project identifier
 * @returns {Promise<object>} Batch email results with per-email status
 */
async function sendBatchEmails(params) {
  const data = {
    title: params.subject,
    body_html: params.bodyHtml,
    receivers: params.receivers,
    project_id: params.projectId,
  }
  if (params.replyTo) data.reply_to = params.replyTo

  return apiHubPost('/send-emails', data)
}

module.exports = { sendEmail, sendBatchEmails }
