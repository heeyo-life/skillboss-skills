const { run } = require('./run')

/**
 * Send SMS verification code (OTP) via Prelude
 * @param {object} params - Verify parameters
 * @param {string} params.phone - Phone number in E.164 format (e.g. "+1234567890")
 * @param {string} [params.ip] - User's IP address for anti-fraud signals
 * @param {string} [params.deviceId] - Device identifier for anti-fraud signals
 * @returns {Promise<object>} Verification result {id, status, method, channels}
 */
async function smsVerify(params) {
  if (!params.phone) {
    throw new Error('--phone is required (E.164 format, e.g. +1234567890)')
  }

  const inputs = {
    target: { type: 'phone_number', value: params.phone },
  }
  if (params.ip || params.deviceId) {
    inputs.signals = {}
    if (params.ip) inputs.signals.ip = params.ip
    if (params.deviceId) inputs.signals.device_id = params.deviceId
  }

  return run({ model: 'prelude/verify-send', inputs })
}

/**
 * Check SMS verification code (OTP) via Prelude
 * @param {object} params - Check parameters
 * @param {string} params.phone - Phone number in E.164 format
 * @param {string} params.code - OTP code received via SMS
 * @returns {Promise<object>} Check result {id, status}
 */
async function smsCheck(params) {
  if (!params.phone) {
    throw new Error('--phone is required (E.164 format, e.g. +1234567890)')
  }
  if (!params.code) {
    throw new Error('--code is required (the OTP code received via SMS)')
  }

  const inputs = {
    target: { type: 'phone_number', value: params.phone },
    code: params.code,
  }

  return run({ model: 'prelude/verify-check', inputs })
}

/**
 * Send SMS notification via Prelude
 * @param {object} params - Notify parameters
 * @param {string} params.phone - Phone number in E.164 format
 * @param {string} params.templateId - Prelude template ID (configured in Prelude dashboard)
 * @param {object} [params.variables] - Template variables
 * @param {string} [params.from] - Sender number
 * @returns {Promise<object>} Send result
 */
async function smsSend(params) {
  if (!params.phone) {
    throw new Error('--phone is required (E.164 format, e.g. +1234567890)')
  }
  if (!params.templateId) {
    throw new Error('--template-id is required (configured in Prelude dashboard)')
  }

  const inputs = {
    template_id: params.templateId,
    to: params.phone,
  }
  if (params.variables) inputs.variables = params.variables
  if (params.from) inputs.from = params.from

  return run({ model: 'prelude/notify-send', inputs })
}

module.exports = { smsVerify, smsCheck, smsSend }
