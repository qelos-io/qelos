<script lang="ts" setup>
import { computed } from 'vue';
import { IBlueprint } from '@qelos/global-types';
import { describeProperty, propertyRows } from '../services/blueprint-editor';

const props = defineProps<{ blueprint: IBlueprint; blueprints: IBlueprint[] }>();
const emit = defineEmits<{ select: [identifier: string]; close: [] }>();

const nameOf = (identifier: string) => props.blueprints.find((item) => item.identifier === identifier)?.name || identifier;
const outgoing = computed(() => (props.blueprint.relations || []).filter((relation) => props.blueprints.some((item) => item.identifier === relation.target)));
const incoming = computed(() =>
  props.blueprints.flatMap((item) =>
    item.identifier === props.blueprint.identifier
      ? []
      : (item.relations || []).filter((relation) => relation.target === props.blueprint.identifier).map((relation) => ({ from: item, key: relation.key })),
  ),
);
const rows = computed(() => propertyRows(props.blueprint.properties));
const linkedKeys = computed(() => new Map((props.blueprint.relations || []).map((relation) => [relation.key, relation.target])));
</script>

<template>
  <aside class="inspector" :aria-label="blueprint.name">
    <header class="head">
      <div class="titles">
        <h3 dir="auto">{{ blueprint.name }}</h3>
        <code dir="ltr">{{ blueprint.identifier }}</code>
      </div>
      <el-button text circle class="close" :aria-label="$t('Close')" @click="emit('close')">
        <font-awesome-icon :icon="['fas', 'xmark']" />
      </el-button>
    </header>

    <div class="body">
      <p v-if="blueprint.description" class="description" dir="auto">{{ blueprint.description }}</p>

      <section v-if="outgoing.length" aria-labelledby="gi-out">
        <h4 id="gi-out">{{ $t('Links to') }}</h4>
        <ul class="links">
          <li v-for="relation in outgoing" :key="relation.key">
            <code dir="ltr">{{ relation.key }}</code>
            <span aria-hidden="true" class="arrow">→</span>
            <button type="button" class="jump" dir="auto" @click="emit('select', relation.target)">{{ nameOf(relation.target) }}</button>
          </li>
        </ul>
      </section>

      <section v-if="incoming.length" aria-labelledby="gi-in">
        <h4 id="gi-in">{{ $t('Linked from') }}</h4>
        <ul class="links">
          <li v-for="item in incoming" :key="item.from.identifier + item.key">
            <button type="button" class="jump" dir="auto" @click="emit('select', item.from.identifier)">{{ item.from.name }}</button>
            <span aria-hidden="true" class="arrow">·</span>
            <code dir="ltr">{{ item.key }}</code>
          </li>
        </ul>
      </section>

      <section aria-labelledby="gi-props">
        <h4 id="gi-props">{{ $t('Properties') }}<span class="count">{{ rows.length }}</span></h4>
        <p v-if="!rows.length" class="none">{{ $t('No properties yet') }}</p>
        <ul v-else class="props">
          <li v-for="row in rows" :key="row.key">
            <span class="prop-name" dir="auto">{{ row.title || row.key }}<b v-if="row.required" class="req" :aria-label="$t('Required')">*</b></span>
            <span class="prop-type">
              <template v-if="linkedKeys.get(row.key)">{{ $t('Links to {name}', { name: nameOf(linkedKeys.get(row.key) as string) }) }}</template>
              <template v-else>{{ $t(describeProperty(row).typeLabel) }}</template>
            </span>
          </li>
        </ul>
      </section>
    </div>

    <footer class="foot">
      <el-button type="primary" @click="$router.push({ name: 'editBlueprint', params: { blueprintIdentifier: blueprint.identifier } })">{{ $t('Edit blueprint') }}</el-button>
    </footer>
  </aside>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  min-block-size: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
  overflow: hidden;
}

.head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 16px 12px;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

.titles {
  flex: 1;
  min-inline-size: 0;
}

h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
}

.titles code {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}

.close {
  flex-shrink: 0;
  margin-block: -4px;
  margin-inline-end: -6px;
  color: var(--el-text-color-secondary);
}

.body {
  flex: 1;
  min-block-size: 0;
  overflow-y: auto;
  padding: 14px 16px;
}

.description {
  margin: 0 0 14px;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  line-height: 1.45;
}

section + section {
  margin-block-start: 18px;
}

h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.count {
  padding: 0 7px;
  border-radius: 999px;
  background: var(--el-fill-color);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 18px;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.links li,
.props li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-block: 5px;
}

.props li {
  justify-content: space-between;
  border-block-end: 1px solid var(--el-border-color-extra-light);
}

.props li:last-child {
  border-block-end: 0;
}

code {
  font-size: 0.82rem;
}

.arrow {
  color: var(--el-text-color-secondary);
}

.jump {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}

.jump:hover {
  text-decoration: underline;
}

.jump:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

.prop-name {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.req {
  margin-inline-start: 2px;
  color: var(--el-color-danger);
}

.prop-type {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
}

.none {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.foot {
  padding: 12px 16px;
  border-block-start: 1px solid var(--el-border-color-lighter);
}
</style>
