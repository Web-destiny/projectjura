<script setup lang="ts">
defineProps<{ columns: { key: string; label: string }[]; rows: Record<string, string>[]; caption: string }>();
</script>
<template>
  <div class="scroll">
    <table>
      <caption>
        {{
          caption
        }}
      </caption>
      <thead>
        <tr>
          <th v-for="c in columns" :key="c.key" scope="col">{{ c.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td v-for="c in columns" :key="c.key">
            <slot name="cell" :row="row" :column="c" :index="i">{{ row[c.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
}
th,
td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--border);
}
th {
  background: var(--surface-alt);
  position: sticky;
  top: 0;
}
caption {
  text-align: left;
  margin-bottom: var(--space-3);
  color: var(--muted);
}
</style>
