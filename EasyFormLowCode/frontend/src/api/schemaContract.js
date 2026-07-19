import { apiRequest } from './httpClient'

export function getDefaultPageSchema(pageId, { signal } = {}) {
  return apiRequest('/schema-contract/page-schema/default', {
    params: { page_id: pageId },
    signal,
  })
}

export function normalizePageSchemaContract(pageId, schema, { signal } = {}) {
  return apiRequest('/schema-contract/page-schema/normalize', {
    method: 'POST',
    body: {
      page_id: pageId,
      schema_json: schema,
    },
    signal,
  })
}

export function validatePageSchemaContract(pageId, schema, { signal } = {}) {
  return apiRequest('/schema-contract/page-schema/validate', {
    method: 'POST',
    body: {
      page_id: pageId,
      schema_json: schema,
    },
    signal,
  })
}
