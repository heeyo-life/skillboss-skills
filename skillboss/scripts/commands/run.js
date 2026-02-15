const fs = require('fs')
const { apiHubPost, apiHubStream, apiHubRaw, saveBinaryResponse } = require('../lib/client')

/**
 * Generic run command - mirrors /run endpoint exactly
 * @param {object} params - Run parameters
 * @param {string} params.model - Model in "vendor/model" format
 * @param {object} params.inputs - Model-specific inputs
 * @param {boolean} [params.stream] - Enable streaming
 * @param {string} [params.output] - Output file path for binary responses
 * @param {boolean} [params.autoFallback] - Enable automatic fallback on errors (default: true)
 * @returns {Promise<object|AsyncGenerator>} Response data or stream
 */
async function run(params) {
  const request = {
    model: params.model,
    inputs: params.inputs,
    stream: params.stream || false,
    auto_fallback: params.autoFallback !== false, // Enable by default
  }

  if (params.stream) {
    return apiHubStream('/run', request)
  }

  if (params.output) {
    const response = await apiHubRaw('/run', request)
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      await saveBinaryResponse(response, params.output)
      return { saved: params.output }
    }
    // For JSON responses, check for errors before saving
    const data = await response.json()
    if (data.code && data.code >= 400) {
      throw new Error(data.message || `API error: ${data.code}`)
    }

    // Check if response contains media URL(s) and download the actual file
    let mediaUrl = null
    let mediaType = 'file'

    // Image URL patterns
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      typeof data[0] === 'string' &&
      data[0].startsWith('http')
    ) {
      // Flux-style response: ["https://..."]
      mediaUrl = data[0]
      mediaType = 'image'
    } else if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
      // DALL-E style response: {data: [{url: "https://..."}]}
      mediaUrl = data.data[0].url
      mediaType = 'image'
    } else if (
      data.generated_images &&
      Array.isArray(data.generated_images) &&
      data.generated_images[0]
    ) {
      // Gemini-style response: {generated_images: ["https://..."]}
      mediaUrl = data.generated_images[0]
      mediaType = 'image'
    } else if (
      data.image_url &&
      typeof data.image_url === 'string' &&
      data.image_url.startsWith('http')
    ) {
      // MM-style response: {image_url: "https://..."}
      mediaUrl = data.image_url
      mediaType = 'image'
    }
    // Audio URL patterns
    else if (
      data.audio_url &&
      typeof data.audio_url === 'string' &&
      data.audio_url.startsWith('http')
    ) {
      // MM TTS response: {audio_url: "https://..."}
      mediaUrl = data.audio_url
      mediaType = 'audio'
    }
    // Video URL patterns
    else if (data.video_url) {
      // Common video response: {video_url: "https://..."}
      mediaUrl = data.video_url
      mediaType = 'video'
    } else if (
      data.output &&
      typeof data.output === 'string' &&
      data.output.startsWith('http')
    ) {
      // Replicate-style response: {output: "https://..."}
      mediaUrl = data.output
      mediaType = 'video'
    } else if (
      data.video &&
      typeof data.video === 'string' &&
      data.video.startsWith('http')
    ) {
      // Alternative video response: {video: "https://..."}
      mediaUrl = data.video
      mediaType = 'video'
    } else if (data.file_id && data.base_resp?.status_code === 0) {
      // MiniMax async video - need to poll for result
      // For now, return the response and let user know it's processing
      console.log('Video generation started. File ID:', data.file_id)
      fs.writeFileSync(params.output, JSON.stringify(data, null, 2))
      return { processing: true, file_id: data.file_id, saved: params.output }
    } else if (
      data.generatedSamples &&
      Array.isArray(data.generatedSamples) &&
      data.generatedSamples[0]?.video?.uri
    ) {
      // Vertex/Veo response: {generatedSamples: [{video: {uri: "https://..."}}]}
      mediaUrl = data.generatedSamples[0].video.uri
      mediaType = 'video'
    } else if (data.videos && Array.isArray(data.videos) && data.videos[0]) {
      // Vertex/Veo response: {videos: ["https://..."]}
      mediaUrl = data.videos[0]
      mediaType = 'video'
    }

    if (mediaUrl) {
      // Download the actual media file from URL
      const mediaResponse = await fetch(mediaUrl)
      if (!mediaResponse.ok) {
        throw new Error(
          `Failed to download ${mediaType} from ${mediaUrl}: ${mediaResponse.status}`,
        )
      }
      await saveBinaryResponse(mediaResponse, params.output)
      return { saved: params.output, url: mediaUrl, type: mediaType }
    }

    fs.writeFileSync(params.output, JSON.stringify(data, null, 2))
    return data
  }

  return apiHubPost('/run', request)
}

module.exports = { run }
