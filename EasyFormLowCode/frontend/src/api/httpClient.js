import { API_BASE_URL } from '../config/appConfig'

export class ApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function buildUrl(path, params) {
  const base = API_BASE_URL.replace(/\/$/, '')
  const normalizedPath = String(path).replace(/^\//, '')
  const url = new URL(`${base}/${normalizedPath}`, window.location.origin)

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      url.searchParams.set(key, value)
    }
  })

  return url
}

export async function apiRequest(path, options = {}) {
  const { body, headers, params, ...fetchOptions } = options
  const response = await fetch(buildUrl(path, params), {
    ...fetchOptions,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = payload?.detail || payload?.message || `Request failed with ${response.status}`
    throw new ApiError(message, { status: response.status, payload })
  }

  return payload
}
