---
title: Introduction to the SDK
editLink: true
---

# {{ $frontmatter.title }}

<!-- 1page Installation -->

Welcome to the Qelos SDK documentation. This section provides an overview of the SDK, including its core features, installation, and basic usage. Whether you are a developer or an administrator, this guide will help you get started with the SDK.


<!-- ## Installation

To install the Qelos SDK, use the following npm command:

```bash
npm install @qelos/sdk
```

## Setup

### Regular User

Create an instance of the Qelos SDK for a regular user.

```bash
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://yourdomain.com',
  fetch: window.fetch // Use globalThis.fetch if using Node.js
});

export default sdk;
```

### Administrator

Create an instance of the Qelos SDK for an administrator.

```bash
import QelosAdminSDK from '@qelos/sdk/dist/administrator';
import nodeFetch from 'node-fetch';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://yourdomain.com',
  fetch: nodeFetch // Use globalThis.fetch if using Node.js
});

export default sdkAdmin;
``` -->

<!-- 2page Authentication -->

<!-- ## Authentication

### Sign In Regular User

```bash
await sdk.authentication.signin({ username: "test@test.com", password: "admin" });
```

### OAuth Sign In

```bash
await sdk.authentication.oAuthSignin({ username: "test@test.com", password: "admin" });
``` -->

<!-- 3 page Basic Usage  -->

<!-- ## Basic Usage -->

<!-- Usage for React -->

<!-- ### Fetching Posts

```bash
// MyPostsList.tsx
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
      {plugins.map(post => <PostItem plugin={plugin} key={plugin._id} />)}
    </div>
  );
}

export default MyPluginsList;
``` -->

<!-- Usage for Backend ?-->

<!-- import QelosAdminSDK from '@qelos/sdk/dist/administrator';
import nodeFetch from 'node-fetch';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://yourdomain.com',
  fetch: nodeFetch // Use globalThis.fetch if using Node.js
});

export default sdkAdmin; -->

<!-- Blueprints SDK -->

<!-- ### Fetching Blueprints

```bash
const blueprints = await sdk.blueprints.getList();
const specificBlueprint = await sdk.blueprints.getBlueprint('meetings');
```

## Administrator Operations

### Managing Blueprints

```bash
// Create a blueprint
await sdkAdmin.manageBlueprints.create({ name: 'New Blueprint', description: 'Description of the blueprint' });

// Update a blueprint
await sdkAdmin.manageBlueprints.update('blueprintId', { name: 'Updated Name' });

// Remove a blueprint
await sdkAdmin.manageBlueprints.remove('blueprintId');

// Get list of blueprints
const blueprints = await sdkAdmin.manageBlueprints.getList();

// Get a specific blueprint
const blueprint = await sdkAdmin.manageBlueprints.getBlueprint('blueprintId');
``` -->

<!-- Managing Configurations SDK -->

<!-- ### Managing Configurations

```bash
// Create a configuration
await sdkAdmin.manageConfigurations.create({
  key: 'configKey',
  public: true,
  description: 'Configuration description',
  metadata: { setting: 'value' }
});

// Update a configuration
await sdkAdmin.manageConfigurations.update('configKey', { public: false });

// Remove a configuration
await sdkAdmin.manageConfigurations.remove('configKey');

// Get list of configurations
const configurations = await sdkAdmin.manageConfigurations.getList('configKey');
``` -->

<!-- Managing Layouts SDK -->

<!-- ### Managing Layouts

```bash
// Create a layout
await sdkAdmin.manageLayouts.create({ kind: 'layoutKind', data: { layout: 'data' } });

// Update a layout
await sdkAdmin.manageLayouts.update('layoutKind', { data: { layout: 'newData' } });

// Remove a layout
await sdkAdmin.manageLayouts.remove('layoutKind');

// Get list of layouts
const layouts = await sdkAdmin.manageLayouts.getList();
``` -->

<!-- Managing Plugins SDK -->

<!-- ### Managing Plugins

```bash
// Create a plugin
await sdkAdmin.managePlugins.create({ name: 'New Plugin', version: '1.0.0' });

// Update a plugin
await sdkAdmin.managePlugins.update('pluginId', { version: '1.1.0' });

// Remove a plugin
await sdkAdmin.managePlugins.remove('pluginId');

// Get list of plugins
const plugins = await sdkAdmin.managePlugins.getList();
``` -->

<!-- Managing users SDK -->

<!-- ### Managing users

```bash
// Create a user
await sdkAdmin.users.create({ username: 'newuser', email: 'newuser@example.com', password: 'password' });

// Update a user
await sdkAdmin.users.update('userId', { email: 'newemail@example.com' });

// Remove a user
await sdkAdmin.users.remove('userId');

// Get a specific user
const user = await sdkAdmin.users.getUser('userId');

// Get list of users
const users = await sdkAdmin.users.getList();
``` -->

<!-- Managing Workspaces SDK -->

<!-- ### Admin Workspaces

```bash

// Call an API endpoint
const response = await sdkAdmin.adminWorkspaces.callApi('/endpoint', { method: 'GET' });

// Get list of workspaces
const workspaces = await sdkAdmin.adminWorkspaces.getList();
``` -->

<!-- Managing Custom Configuration Management SDK -->

<!-- ## Custom Configuration Management

The Qelos SDK also allows managing custom configurations.

```bash
// Get list of configurations
const configurations = await sdkAdmin.manageConfigurations.getList('configKey');

// Get a specific configuration
const configuration = await sdkAdmin.manageConfigurations.getConfiguration('configKey');

// Create a configuration
await sdkAdmin.manageConfigurations.create({
  key: 'configKey',
  public: true,
  metadata: { some: 'data' }
});

// Update a configuration
await sdkAdmin.manageConfigurations.update('configKey', { public: false });

// Remove a configuration
await sdkAdmin.manageConfigurations.remove('configKey');
``` -->

