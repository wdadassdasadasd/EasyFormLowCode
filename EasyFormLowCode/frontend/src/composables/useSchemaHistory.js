import { ref } from 'vue'

import { clonePageSchema } from '../schema/pageSchema'

const HISTORY_LIMIT = 50

export function useSchemaHistory() {
  const past = ref([])
  const future = ref([])
  const labels = ref([])
  const canUndo = ref(false)
  const canRedo = ref(false)

  function syncState() {
    canUndo.value = past.value.length > 1
    canRedo.value = future.value.length > 0
  }

  function reset(schema, label = 'reset') {
    past.value = [clonePageSchema(schema)]
    future.value = []
    labels.value = [label]
    syncState()
  }

  function commit(schema, label = 'edit') {
    const snapshot = clonePageSchema(schema)
    const latest = past.value.at(-1)
    if (latest && JSON.stringify(latest) === JSON.stringify(snapshot)) return
    past.value = [...past.value, snapshot].slice(-HISTORY_LIMIT)
    labels.value = [...labels.value, label].slice(-HISTORY_LIMIT)
    future.value = []
    syncState()
  }

  function undo() {
    if (past.value.length < 2) return null
    const current = past.value.at(-1)
    past.value = past.value.slice(0, -1)
    labels.value = labels.value.slice(0, -1)
    future.value = [current, ...future.value].slice(0, HISTORY_LIMIT)
    syncState()
    return clonePageSchema(past.value.at(-1))
  }

  function redo() {
    const next = future.value[0]
    if (!next) return null
    future.value = future.value.slice(1)
    past.value = [...past.value, clonePageSchema(next)].slice(-HISTORY_LIMIT)
    labels.value = [...labels.value, 'redo'].slice(-HISTORY_LIMIT)
    syncState()
    return clonePageSchema(next)
  }

  function currentLabel() {
    return labels.value.at(-1) || ''
  }

  return { canRedo, canUndo, commit, currentLabel, redo, reset, undo }
}
