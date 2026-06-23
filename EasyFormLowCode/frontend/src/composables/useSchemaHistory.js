import { ref } from 'vue'

import { clonePageSchema } from '../schema/pageSchema'

const HISTORY_LIMIT = 50

export function useSchemaHistory() {
  const past = ref([])
  const future = ref([])

  function reset(schema) {
    past.value = [clonePageSchema(schema)]
    future.value = []
  }

  function commit(schema) {
    const snapshot = clonePageSchema(schema)
    const latest = past.value.at(-1)
    if (latest && JSON.stringify(latest) === JSON.stringify(snapshot)) return
    past.value = [...past.value, snapshot].slice(-HISTORY_LIMIT)
    future.value = []
  }

  function undo() {
    if (past.value.length < 2) return null
    const current = past.value.at(-1)
    past.value = past.value.slice(0, -1)
    future.value = [current, ...future.value].slice(0, HISTORY_LIMIT)
    return clonePageSchema(past.value.at(-1))
  }

  function redo() {
    const next = future.value[0]
    if (!next) return null
    future.value = future.value.slice(1)
    past.value = [...past.value, clonePageSchema(next)].slice(-HISTORY_LIMIT)
    return clonePageSchema(next)
  }

  return { commit, redo, reset, undo }
}
