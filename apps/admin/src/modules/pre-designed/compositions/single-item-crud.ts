import { computed } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { useRoute } from 'vue-router';
import { isEditingEnabled } from '@/modules/core/store/auth';

export function useSingleItemCrud() {
  const mfes = usePluginsMicroFrontends();
  const route = useRoute()

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
  const api = computed(() => mfes.cruds[crud.value.name].api);
  const givenStructure = computed(() => {
    return (route.meta.mfe as any)?.structure || '<div></div>';
  });

  function getTemplate(html: string = givenStructure.value) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template;
  }

  const relevantStructure = computed(() => {
    const template = getTemplate(givenStructure.value);

    if (isEditingEnabled.value) {
      template.content.querySelectorAll('*').forEach((el, index) => {
        el.setAttribute('data-ql-id', index.toString());

        if (el.tagName.toLowerCase() === 'template') {
          Array.from((el as HTMLTemplateElement).content.querySelectorAll('*')).forEach((innerEl, index) => {
            innerEl.setAttribute('data-ql-id', (index + 1).toString() + '-inner-' + index.toString());
          })
          return;
        }
      });
      Array.from(template.content.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div')).forEach((el) => {
        const newEl = document.createElement('editable-content');
        el.replaceWith(newEl);
        newEl.appendChild(el);
        el.getAttributeNames().forEach((attr) => {
          newEl.setAttribute(attr, el.getAttribute(attr));
          if (attr.startsWith('v-else')) {
            el.removeAttribute(attr);
          }
        })
      })
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