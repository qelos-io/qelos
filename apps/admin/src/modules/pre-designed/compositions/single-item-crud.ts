import { computed } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { useRoute } from 'vue-router';
import { isEditingEnabled } from '@/modules/core/store/auth';
import { usePluginsStore } from '@/modules/plugins/store/pluginsStore';

const editableContent = document.createElement('editable-content');
const selector = 'p, h1, h2, h3, h4, h5, h6, div, remove-confirmation, block-item, empty-state, ai-chat, el-button, el-select, el-input, el-form, form, life-cycle, list-page-title, quick-table, v-chart';

export function useSingleItemCrud() {
  const mfes = usePluginsMicroFrontends();
  const pluginsStore = usePluginsStore();
  const route = useRoute()

  const editableElementsSelector = computed(() => {
    const customComponents = pluginsStore.loadedCustomComponents;
    if (!customComponents.length) {
      return selector;
    }
    return `${selector}, ${customComponents.join(', ')}`;
  });

  const crud = computed(() => {
    const crud = route.meta.crud as any || { display: {} };
    return {
      ...crud,
      display: {
        name: 'item',
        capitalizedPlural: 'Items',
        ...(crud.display || {}),
      },
      screen: {
        structure: (route.meta.mfe as any)?.structure
      }
    }
  });
  const api = computed(() => mfes.cruds[crud.value?.name]?.api);
  const givenStructure = computed(() => {
    return (route.meta.mfe as any)?.structure || '<div></div>';
  });

  function getTemplate(html: string = givenStructure.value) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template;
  }

  function convertToEditableContent(template: HTMLTemplateElement) {
    Array.from(template.content.querySelectorAll(editableElementsSelector.value)).forEach((el) => {
      const newEl = editableContent.cloneNode() as HTMLElement;
      newEl.setAttribute('data-ql-component', el.tagName.toLowerCase());
      el.replaceWith(newEl);
      el.getAttributeNames().forEach((attr) => {
        attr = attr.trim();
        const firstChar = attr[0];
        if (!attr || firstChar === '#') {
          return;
        }
        try {
          newEl.setAttribute(firstChar === '@' ? attr.replace('@', 'v-on:') : attr, el.getAttribute(attr));
        } catch {
          //
        }
        if (attr.startsWith('v-else') || attr === 'v-for') {
          el.removeAttribute(attr);
        }
      })
      newEl.appendChild(el);
    })
  }

  const relevantStructure = computed(() => {
    const template = getTemplate(givenStructure.value);

    if (isEditingEnabled.value) {
      template.content.querySelectorAll('*').forEach((el, index) => {
        el.setAttribute('data-ql-id', index.toString());

        if (el.tagName.toLowerCase() === 'template') {
          Array.from((el as HTMLTemplateElement).content.querySelectorAll('*')).forEach((innerEl, innerIndex) => {
            innerEl.setAttribute('data-ql-id', index.toString() + '-inner-' + innerIndex.toString());
          })
          return;
        }
      });
      convertToEditableContent(template);
      template.content.querySelectorAll('template').forEach((el => convertToEditableContent(el)))
    }
    return template.innerHTML;
  });

  const styles = computed(() => {
    if (givenStructure.value.includes('<style>')) {
      return Array.from(getTemplate(givenStructure.value).content.querySelectorAll('style'))
        .map((style) => style.innerHTML)
        .join('\n');
    }
  })

  return {
    crud,
    api,
    relevantStructure,
    styles
  }
}