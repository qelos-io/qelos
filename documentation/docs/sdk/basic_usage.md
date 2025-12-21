---
title: Basic Usage
---

# {{ $frontmatter.title }}

Welcome to the Basic Usage section of the Qelos SDK documentation. This section provides an overview of using the SDK for both frontend and backend applications, including different methods for regular users and administrators.

## Usage for Frontend

### Fetching Blocks in a React Application

In a frontend React application, you can fetch and display a list of blocks as follows:

```typescript
// MyBlocksList.tsx
import React, { useState, useEffect } from 'react';
import sdk from './my-sdk';

function MyBlocksList() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    sdk.blocks.getList().then(setBlocks);
  }, []);

  return (
    <div>
      {blocks.map(block => <BlockItem block={block} key={block._id} />)}
    </div>
  );
}

export default MyBlocksList;
```

**Explanation: Fetching Blocks in a React Application**

- **Import SDK**: Import the SDK module.
- **State Management**: Use React hooks to manage the state of blocks.
- **Effect Hook**: Fetch the list of blocks when the component mounts.
- **Rendering**: Display the list of blocks using the `BlockItem` component.

---

### Fetching Blocks in a Vue.js 3 Application

In a frontend Vue.js 3 application, you can fetch and display a list of blocks as follows:

```vue
<!-- MyBlocksList.vue -->
<template>
  <div>
    <div v-for="block in blocks" :key="block._id">
      <BlockItem :block="block" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import sdk from './my-sdk';
import BlockItem from './BlockItem.vue';

const blocks = ref([]);

const fetchBlocks = async () => {
  blocks.value = await sdk.blocks.getList();
};

onMounted(fetchBlocks);
</script>
```

**Explanation: Fetching Blocks in a Vue.js 3 Application**

- **Import SDK**: Import the SDK module.
- **Template**: Loops through blocks and renders each using the BlockItem component.
- **Reactive References**: Uses Vue's `ref` to create reactive state for blocks.
- **Setup Function**: Uses the Composition API with `<script setup>` syntax.
- **Fetch Blocks**: The `fetchBlocks` method retrieves the block list from the SDK.
- **Lifecycle Hooks**: `onMounted` is used to fetch blocks when the component first loads.

## Usage For Backend

### Usage For Backend Regular User

This section demonstrates how to create an instance of the Qelos SDK for regular users in different environments.

```typescript
// Import the regular version of the Qelos SDK
import QelosSDK from '@qelos/sdk';

// Create an instance of QelosSDK
const sdk = new QelosSDK({
  appUrl: 'https://yourdomain.com', // Change to 'http://localhost:3000' if running locally
  fetch: globalThis.fetch // Use globalThis.fetch in Node.js 18+ or window.fetch in browser
});

export default sdk;

// Example of fetching blocks
async function fetchBlocks() {
  try {
    const blocks = await sdk.blocks.getList();
    console.log(blocks);
  } catch (error) {
    console.error('Error fetching blocks:', error);
  }
}

fetchBlocks();
```

### Usage For Backend Administrator

This section demonstrates how to create an instance of the Qelos SDK for administrators and provides an example of managing plugins.

```typescript
// Import the administrator version of the Qelos SDK
import QelosAdminSDK from '@qelos/sdk/administrator';

// Create an instance of QelosAdminSDK
const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://yourdomain.com', // Change to 'http://localhost:3000' if running locally
  fetch: globalThis.fetch // Use globalThis.fetch in Node.js 18+
});

export default sdkAdmin;

// Example of fetching plugins (admin only)
async function fetchPlugins() {
  try {
    const plugins = await sdkAdmin.managePlugins.getList();
    console.log(plugins);
  } catch (error) {
    console.error('Error fetching plugins:', error);
  }
}

fetchPlugins();
```

**Explanation: Usage For Backend For Regular User and For Administrator**

- **Import SDK**: Import the administrator version of the Qelos SDK.
- **Initialize SDK**: Create an instance of the SDK for administrative tasks, specifying the application URL and fetch method.
- **Fetch Plugins**: Define a function to fetch the list of plugins using the admin SDK's `managePlugins` module.
- **appUrl**: Set to `'http://localhost:3000'` for local development; use the production URL otherwise.
- **fetch**: Use `globalThis.fetch` in Node.js 18+ or later. For older versions, you may need to use a polyfill like `node-fetch`.
