<template>
  <main>
    <h1>{{ crud.display.capitalizedPlural }}</h1>
    <TemplatedRowItem v-for="(row, index) in list" :key="row[identifierKey] || index"
                      :row="row"
                      :header="structure.header"
                      :content="structure.content"
                      :actions="structure.actions"
                      @remove="removeRow(row)"
                      @edit="moveTo('edit', row)"
                      @view="moveTo('view', row)"
    />
  </main>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import TemplatedRowItem from '@/modules/pre-designed/components/TemplatedRowItem.vue';
import {usePluginsMicroFrontends} from '@/modules/plugins/store/plugins-microfrontends';

const route = useRoute();
const router = useRouter()
const mfes = usePluginsMicroFrontends();

const crud = computed(() => {
  const crud = route.meta.crud as any || {display: {}};
  return {
    ...crud,
    display: {
      name: 'item',
      capitalizedPlural: 'Items',
      ...(crud.display || {}),
    },
    screen: {
      structure: (route.meta.mfe as any)?.structure as string || `<h3>{{ row.title }}</h3>
{{ row.content }}
<action>
<button for="edit">Edit</button>
<button for="remove">{{ $t('Remove') }}</button>
</action>`
    },
  }
});

function toTemplate(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();

  return template;
}

function setSelectorToComponent(el: HTMLTemplateElement, selector: string, componentName: string) {
  el
      .content
      .querySelectorAll(selector)
      .forEach(btn => {
        const replaced = document.createElement(componentName);
        replaced.innerHTML = btn.innerHTML;
        (btn.parentElement || el.content).insertBefore(replaced, btn);
        btn.remove();
      })
}

function setRemoveButton(el: HTMLTemplateElement) {
  setSelectorToComponent(el, 'button[for="remove"]', 'templated-remove-button')
}

function setAllButtons(el: HTMLTemplateElement) {
  setRemoveButton(el);
  setSelectorToComponent(el, 'button[for="edit"]', 'templated-edit-button')
  setSelectorToComponent(el, 'button[for="view"]', 'templated-view-button')
}

function setEditLink(el: HTMLTemplateElement) {
  el
      .content
      .querySelectorAll('a[href="edit"]')
      .forEach(anchor => {
        anchor.removeAttribute('href')
        anchor.setAttribute('v-on:click.native', `$parent.$parent.$parent.$emit('edit')`)
      })
}

function setViewLink(el: HTMLTemplateElement) {
  el
      .content
      .querySelectorAll('a[href="view"]')
      .forEach(anchor => {
        anchor.removeAttribute('href')
        anchor.setAttribute('v-on:click.native', `$parent.$parent.$parent.$emit('view')`)
      })
}

const structure = computed(() => {
  let header, content, actionsContent = '';
  const template = toTemplate(crud.value.screen.structure);
  const actionsEl = template.content.querySelector('actions');
  setEditLink(template);
  if (template.content.firstChild.nodeName.startsWith('H')) {
    header = (template.content.firstChild as HTMLElement).outerHTML;
    template.content.removeChild(template.content.firstChild);
  }
  setRemoveButton(template);

  if (actionsEl) {
    const actionsTemplate = toTemplate(actionsEl.innerHTML);
    actionsEl.remove();
    setAllButtons(actionsTemplate);
    setEditLink(actionsTemplate);
    setViewLink(actionsTemplate);
    actionsContent = actionsTemplate.innerHTML.trim();
  }

  content = template.innerHTML.trim();

  return {
    header,
    content,
    actions: actionsContent,
  }
})
const api = computed(() => mfes.cruds[crud.value.name].api);
const identifierKey = computed(() => mfes.cruds[crud.value.name].identifierKey || '_id');
const list = ref();

function load() {
  api.value?.getAll().then(data => {
    list.value = data
  });
}

async function removeRow(row) {
  await api.value.remove(row[identifierKey.value]);
  load();
}

function moveTo(to, row) {
  router.push(`${to}-${crud.value.display.name}/${row[identifierKey.value]}`)
}

watch(api, load, {immediate: true})
</script>

<style scoped>

</style>