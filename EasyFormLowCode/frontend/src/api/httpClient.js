import { API_BASE_URL } from '../config/appConfig'

export class ApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function resolveErrorMessage(payload, status) {
  if (typeof payload?.detail === 'string' && payload.detail.trim()) {
    return payload.detail
  }
  if (typeof payload?.detail?.message === 'string' && payload.detail.message.trim()) {
    return payload.detail.message
  }
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message
  }
  return `Request failed with ${status}`
}

function buildUrl(path, params, baseUrl = API_BASE_URL) {
  const rawPath = String(path || '')
  const url = /^https?:\/\//.test(rawPath)
    ? new URL(rawPath)
    : new URL(`${String(baseUrl).replace(/\/$/, '')}/${rawPath.replace(/^\//, '')}`, window.location.origin)

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      url.searchParams.set(key, value)
    }
  })

  return url
}

export async function apiRequest(path, options = {}) {
  const { baseUrl, body, headers, onRequestSettled, params, ...fetchOptions } = options
  const url = buildUrl(path, params, baseUrl)
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
  let response = null
  let payload = null
  let requestError = null

  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    const text = await response.text()
    payload = text ? JSON.parse(text) : null

    if (!response.ok) {
      const message = resolveErrorMessage(payload, response.status)
      throw new ApiError(message, { status: response.status, payload })
    }

    return payload
  } catch (error) {
    requestError = error
    throw error
  } finally {
    onRequestSettled?.({
      method: String(fetchOptions.method || 'GET').toUpperCase(),
      url: url.toString(),
      params: params || {},
      body,
      status: response?.status || null,
      ok: Boolean(response?.ok),
      durationMs: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt),
      payload,
      error: requestError?.message || null,
    })
  }
}
