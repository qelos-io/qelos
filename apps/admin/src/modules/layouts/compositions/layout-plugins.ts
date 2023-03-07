import {computed, ref, toRef} from 'vue';
import {ILayoutContent, IPlugin} from '@qelos/view-builder/src';
import {LayoutConnectedDataKind} from '@qelos/sdk/dist/administrator/layouts';
import {useBlocksList} from '@/modules/blocks/store/blocks-list';

export function getStylesheetContent(href = ''): ILayoutContent {
  return {
    component: 'link',
    predefined: false,
    classes: '',
    props: {
      rel: 'stylesheet',
      href,
    },
  }
}

function getStylesheetPlugin(href = ''): IPlugin {
  return {
    match: 'link[rel=stylesheet]',
    component: 'link',
    title: 'Resource Link to CSS',
    description: 'Load CSS file in page',
    supportChildren: false,
    props: {
      rel: 'stylesheet',
      href,
    },
  };
}

const customPlugins: Record<string, IPlugin[]> = {}
//
// const basicPlugins: IPlugin[] = [
//   {
//     match: 'div.flex-row',
//     component: 'div',
//     title: 'Row',
//     description: 'Flex Row Div',
//     classes: 'flex-row',
//   },
//   getStylesheetPlugin(),
//   ...['div', 'header', 'footer', 'main', 'aside', 'section'].map(tag => {
//     return {
//       match: tag,
//       component: tag,
//       title: tag,
//       description: tag,
//       supportChildren: true,
//       showChildren: true,
//     }
//   }),
// ];

function getBlockPlugin({_id, name, description}) {
  const reference = 'block_' + _id;
  return {
    match: `BlockBox[block=${reference}]`,
    component: 'BlockBox',
    title: 'Block: ' + name,
    description: description || 'Managed Content from Blocks',
    supportChildren: false,
    predefined: true,
    props: {
      block: reference
    },
    connectedData: {
      kind: LayoutConnectedDataKind.BLOCK,
      reference,
      identifier: _id,
    }
  };
}

//
// function getMenuPlugin(menuName: string) {
//   const reference = 'menu_' + menuName;
//   return {
//     match: `Menu[menu=${reference}]`,
//     component: 'Menu',
//     title: 'Menu: ' + menuName,
//     description: 'Links menu',
//     supportChildren: false,
//     predefined: true,
//     props: {
//       menu: reference
//     },
//     connectedData: {
//       kind: LayoutConnectedDataKind.MENU,
//       reference,
//       identifier: menuName
//     }
//   };
// }

export function usePlugins() {
  const blocks = toRef(useBlocksList(), 'blocks');
  const basicPlugins = [getStylesheetPlugin()];
  return computed(() => {
    return [
      ...basicPlugins,
      ...(blocks.value || []).map(getBlockPlugin)
    ]
  });
}
