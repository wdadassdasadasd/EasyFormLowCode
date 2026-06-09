<template>
  <el-table-column :prop="normalizedField.prop" :label="normalizedField.label" :min-width="minWidth">
    <template #header>
      <slot name="header" :field="normalizedField">
        {{ normalizedField.label }}
      </slot>
    </template>

    <template #default="{ row }">
      <slot name="default" :row="row" :field="normalizedField" :value="row[normalizedField.prop]">
        {{ formatFieldValue(normalizedField, row[normalizedField.prop]) }}
      </slot>
    </template>
  </el-table-column>
</template>

<script setup>
import { computed } from 'vue'

import { formatFieldValue, getFieldTypeConfig, normalizeField } from '../schema/fieldTypes'

const props = defineProps({
  field: {
    type: Object,
    required: true,
  },
})

const normalizedField = computed(() => normalizeField(props.field))
const minWidth = computed(() => getFieldTypeConfig(normalizedField.value.type).table.minWidth || 140)
</script>
