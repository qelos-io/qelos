import {onMounted, ref, toRef} from 'vue';
import {IOnCreateEventDetail} from '@qelos/view-builder/src';
import {useBlocksList} from '@/modules/blocks/store/blocks-list';

export function useLayoutBuilder({content, connectedData, layout}) {
  const builder = ref();
  const editedItem = ref<IOnCreateEventDetail>(null)
  const blocks = toRef(useBlocksList(), 'blocks');

  function onChangeItem(event) {
    content.value = event.detail.layout.content;
  }

  function onCreateItem(e) {
    const detail: IOnCreateEventDetail = e.detail;
    const plugin = detail.plugin;
    if (!plugin) {
      return;
    }
    if (plugin.connectedData) {
      const existingReference = connectedData.value.find(cd => cd.reference === plugin.connectedData.reference);
      if (!existingReference) {
        connectedData.value = connectedData.value.concat([plugin.connectedData]);
      }
      console.log(detail)
    }
  }

  function onEditItem(event) {
    editedItem.value = event.detail;
  }

  function onChangeContent({props, classes}) {
    const itemContent = editedItem.value.content;
    if (props) {
      itemContent.props = props;
    }
    itemContent.classes = classes;

    editedItem.value.target.content = itemContent;
    content.value = builder.value.layout.content;
    editedItem.value = null;
  }

  const contentDisplayElement = ({content, plugin}) => {
    const div = document.createElement('div');

    if (content.props) {
      const blockIdentifier = (Object.values(content.props || {}) as string[]).find(val => val.startsWith('block_'))
      const block = blockIdentifier && blocks.value?.find(block => block._id === blockIdentifier.replace('block_', ''))?.content
      if (block) {
        div.innerHTML = block;
      } else {
        div.innerHTML = 'Properties: ' + Object.entries(content.props)
          .map(([key, value]: [string, string]) => `<span class="item-label" title="${value}">${key}: <strong>${value.length > 20 ? (value.slice(0, 20) + '...') : value}</strong></span>`).join('')
      }
      return div;
    }

    return null;
  }

  onMounted(() => {
    builder.value.setContentDisplayCreator(contentDisplayElement);
    builder.value.layout = layout.value;
  })

  return {
    builder,
    editedItem,
    onChangeItem,
    onCreateItem,
    onEditItem,
    onChangeContent,
  }
}
