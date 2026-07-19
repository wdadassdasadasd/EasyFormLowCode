import { expect, test } from '@playwright/test'

test('entity page lifecycle supports save, publish, runtime CRUD, and version rollback', async ({ page }) => {
  const projectData = await api('/api/projects', { method: 'POST', data: { name: 'E2E Project' } })
  const entityData = await api(`/api/projects/${projectData.id}/entities`, {
    method: 'POST', data: { name: 'E2E Customer', entity_key: 'e2e_customer' },
  })
  await api(`/api/entities/${entityData.id}/fields`, {
    method: 'POST', data: { label: 'Name', field_key: 'name', field_type: 'text', required: true },
  })
  await api(`/api/projects/${projectData.id}/pages`, {
    method: 'POST', data: { page_id: 'e2e_customers', name: 'E2E Customers', entity_id: entityData.id },
  })

  const invalidTemplate = await fetch('http://127.0.0.1:8000/api/projects/' + projectData.id + '/pages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page_id: 'invalid_template', name: 'Invalid', template_schema: { fields: {} } }),
  })
  expect(invalidTemplate.status).toBe(422)
  expect((await api(`/api/projects/${projectData.id}/pages`)).map((item) => item.page_id)).toEqual(['e2e_customers'])

  const initialResources = []
  page.on('request', (resource) => initialResources.push(resource.url()))
  await page.goto(`/pagedesigner?projectId=${projectData.id}&pageId=e2e_customers`)
  await expect(page.getByTestId('designer-save')).toBeVisible()
  expect(initialResources.some((url) => /echarts|zrender|ChartRenderer/i.test(url))).toBe(false)

  await page.getByTestId('designer-save').click()
  await expect.poll(() => api('/api/pages/e2e_customers/versions')).toHaveLength(2)
  await page.getByTestId('designer-publish').click()
  await expect.poll(async () => (await api('/api/pages/e2e_customers')).status).toBe('published')
  await page.getByTestId('designer-save').click()
  await expect.poll(() => api('/api/pages/e2e_customers/versions')).toHaveLength(3)

  await page.goto('/preview?pageId=e2e_customers')
  await page.getByTestId('runtime-create').click()
  await page.getByTestId('field-name').locator('input').fill('Browser user')
  await page.getByTestId('runtime-submit').click()
  await expect.poll(async () => (await api('/api/runtime/pages/e2e_customers/records')).total).toBe(1)

  await page.goto(`/pagedesigner?projectId=${projectData.id}&pageId=e2e_customers`)
  await page.getByTestId('designer-versions').click()
  await expect(page.getByTestId('restore-version-2')).toBeVisible()
  await page.getByTestId('restore-version-2').click()
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await api('/api/pages/e2e_customers')).schema_revision).toBe(4)
})

async function api(path, { method = 'GET', data } = {}) {
  const options = {
    method,
    headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
  }
  if (data !== undefined) options.body = JSON.stringify(data)
  const response = await fetch(`http://127.0.0.1:8000${path}`, options)
  if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}`)
  return response.json()
}
