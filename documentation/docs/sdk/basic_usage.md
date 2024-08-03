---
title: Basic Usage
---

# {{ $frontmatter.title }}

Welcome to the Basic Usage section of the Qelos SDK documentation. This section provides an overview of using the SDK for both frontend and backend applications, including different methods for regular users and administrators.

## Usage for Frontend

### Fetching Plugins in a React Application

In a frontend React application, you can fetch and display a list of plugins as follows:

```bash
/// MyPluginsList.tsx
import React, { useState, useEffect } from 'react';
import sdk from './my-sdk';

function MyPluginsList() {
  const [plugins, setPlugins] = useState([]);
  const [querySearch, setQuery] = useState('');

  useEffect(() => {
    sdk.plugins.getList({ q: querySearch, limit: 50 }).then(setPlugins);
  }, [querySearch]);

  return (
    <div>
      <input type="text" placeholder="Search plugins" onChange={e => setQuery(e.target.value)} />
      {plugins.map(plugin => <PluginItem plugin={plugin} key={plugin._id} />)}
    </div>
  );
}

export default MyPluginsList;
```

**Explanation: Fetching Plugins in a React Application**

- **Import SDK**: Import the SDK module.
- **State Management**: Use React hooks to manage the state of plugins and the search query.
- **Effect Hook**: Fetch the list of plugins whenever the search query changes.
- **Rendering**: Render an input field for search and display the list of plugins using the `PluginItem` component.

---

### Fetching Plugins in a Vue.js 3 application

In a frontend Vue.js 3 application, you can fetch and display a list of plugins as follows:

```bash
<!-- MyPluginsList.vue -->
<template>
  <div>
    <input type="text" placeholder="Search plugins" v-model="querySearch" @input="fetchPlugins" />
    <div v-for="plugin in plugins" :key="plugin._id">
      <PluginItem :plugin="plugin" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import sdk from './my-sdk';
import PluginItem from './PluginItem.vue';

export default {
  components: {
    PluginItem
  },
  setup() {
    const plugins = ref([]);
    const querySearch = ref('');

    const fetchPlugins = async () => {
      plugins.value = await sdk.plugins.getList({ q: querySearch.value, limit: 50 });
    };

    onMounted(fetchPlugins);
    watch(querySearch, fetchPlugins);

    return {
      plugins,
      querySearch,
      fetchPlugins
    };
  }
};
</script>
```

**Explanation: Fetching Plugins in a Vue.js 3 Application**

- **Import SDK**: Import the SDK module.
- **Template**: Includes an input field bound to `querySearch` and a loop to render each plugin using the PluginItem component.
- **Reactive References**: Uses Vue's `ref` to create reactive state for plugins and search query.
- **Setup Function**: Defines the component's logic using the Composition API.
- **Fetch Plugins**: The `fetchPlugins` method retrieves the plugin list from the SDK. It is called initially when the component mounts and whenever the search query changes.
- **Lifecycle Hooks**: `onMounted` is used to fetch plugins when the component first loads, and watch monitors changes to the search query to re-fetch plugins.

## Usage For Backend

### Usage For Backend Regular User

This section demonstrates how to create an instance of the Qelos SDK for regular users in different environments.

```
// Import the regular version of the Qelos SDK
import QelosSDK from '@qelos/sdk';

// Create an instance of QelosSDK
const sdk = new QelosSDK({
  appUrl: 'https://yourdomain.com', // Change to 'https://localhost:3000' if running locally
  fetch: window.fetch // Use globalThis.fetch if using Node.js or node-fetch if installed
});

export default sdk;

// Example of fetching plugins
async function fetchPlugins() {
  try {
    const plugins = await sdk.plugins.getList({ q: '', limit: 50 });
    console.log(plugins);
  } catch (error) {
    console.error('Error fetching plugins:', error);
  }
}

fetchPlugins();
```

### Usage For Backend Administrator

This section demonstrates how to create an instance of the Qelos SDK for administrators and provides an example of fetching plugins.

```
// Import the administrator version of the Qelos SDK and node-fetch
import QelosAdminSDK from '@qelos/sdk/dist/administrator';
import nodeFetch from 'node-fetch';

// Create an instance of QelosAdminSDK
const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://yourdomain.com', // Change to 'https://localhost:3000' if running locally
  fetch: nodeFetch // Use globalThis.fetch if using Node.js without node-fetch
});

export default sdkAdmin;

// Example of fetching plugins
async function fetchPlugins() {
  try {
    const plugins = await sdkAdmin.plugins.getList({ q: '', limit: 50 });
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
- **Fetch Plugins**: Define a function to fetch the list of plugins and log them to the console.
- **appUrl**: Set to `'https://localhost:3000'` for local development; use the production URL otherwise.
- **fetch**:
- Use `node-fetch` in Node.js environments.
- Use `globalThis.fetch` if node-fetch is not installed.
