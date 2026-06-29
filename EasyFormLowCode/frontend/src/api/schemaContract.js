import { apiRequest } from './httpClient'

export function getDefaultPageSchema(pageId) {
  return apiRequest('/schema-contract/page-schema/default', {
    params: { page_id: pageId },
  })
}

export function normalizePageSchemaContract(pageId, schema) {
  return apiRequest('/schema-contract/page-schema/normalize', {
    method: 'POST',
    body: {
      page_id: pageId,
      schema_json: schema,
    },
  })
}

export function validatePageSchemaContract(pageId, schema) {
  return apiRequest('/schema-contract/page-schema/validate', {
    method: 'POST',
    body: {
      page_id: pageId,
      schema_json: schema,
    },
  })
}
