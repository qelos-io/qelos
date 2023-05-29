<template>
  <main>
    <h1>{{ crud.display.capitalizedPlural }}</h1>
    <TemplatedRowItem v-for="(row, index) in list" :key="row[identifierKey] || index"
                      :row="row"
                      :header="structure.header"
                      :content="structure.content"
                      :actions="structure.actions"
                      @remove="removeRow(row)"
                      @edit="moveToEdit(row)"
    />
  </main>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {getCrud} from '@/services/crud';
import {toHTML} from '@/services/markdown-converter';
import TemplatedRowItem from '@/modules/pre-designed/components/TemplatedRowItem.vue';

const route = useRoute();
const router = useRouter()

const crud = computed(() => {
  const crud = route.meta.crud as any || {display: {}};
  const screens = crud.screens || {list: {}}
  return {
    ...crud,
    display: {
      name: 'item',
      capitalizedPlural: 'Items',
      ...(crud.display || {}),
    },
    screens: {
      list: {
        structure:
            `### [{{ row.title }}](edit)
{{ row.content }}
:!:
<button for="edit">Edit</button>
<button for="remove">{{ $t('Remove') }}</button>`,
        ...screens.list,
      },
    },
  }
});

function toTemplate(html) {
  const template = document.createElement('template');
  template.innerHTML = html;

  return template;
}

function setRemoveButton(el: HTMLTemplateElement) {
  el
      .content
      .querySelectorAll('button[for="remove"]')
      .forEach(btn => {
        const replaced = document.createElement('templated-remove-button');
        replaced.innerHTML = btn.innerHTML;
        (btn.parentElement || el.content).insertBefore(replaced, btn);
        btn.remove();
      })
}

function setEditButton(el: HTMLTemplateElement) {
  el
      .content
      .querySelectorAll('button[for="edit"]')
      .forEach(btn => {
        const replaced = document.createElement('templated-edit-button');
        replaced.innerHTML = btn.innerHTML;
        (btn.parentElement || el.content).insertBefore(replaced, btn);
        btn.remove();
      })
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

const structure = computed(() => {
  const [body, actions] = crud.value.screens.list.structure.split('\n:!:\n');

  let header, content;
  const template = toTemplate(toHTML(body));
  setEditLink(template);
  if (template.content.firstChild.nodeName.startsWith('H')) {
    header = (template.content.firstChild as HTMLElement).outerHTML;
    template.content.removeChild(template.content.firstChild);
  }
  setRemoveButton(template);
  content = template.innerHTML;

  const actionsTemplate = toTemplate(toHTML(actions));
  setRemoveButton(actionsTemplate);
  setEditButton(actionsTemplate);
  setEditLink(actionsTemplate);

  return {
    header,
    content,
    actions: actionsTemplate.innerHTML
  }
})

const api = computed(() => getCrud(route.meta.crudBasePath as string || ''))
const list = ref();

const identifierKey = computed<string>(() => route.meta.identifierKey as string || '_id');

function load() {
  api.value.getAll().then(data => list.value = data);
}

async function removeRow(row) {
  await api.value.remove(row[identifierKey.value]);
  load();
}

function moveToEdit(row) {
  router.push(`edit-${crud.value.display.name}/${row[identifierKey.value]}`)
}

watch(api, load, {immediate: true})
</script>

<style scoped>

</style>