---
title: Managing Plugins
---

# {{ $frontmatter.title }}

This section provides an overview of managing plugins using the Qelos SDK. The examples demonstrate how to create, update, remove, and retrieve plugin information, enabling administrators to effectively manage plugins.

**Note**: Plugin management is only available through the administrator SDK (`QelosAdminSDK`), not the regular SDK.

## Plugin Methods

The `managePlugins` module in the administrator SDK provides the following methods:

### Getting List of Plugins

To get a list of all plugins:

```typescript
const plugins = await sdkAdmin.managePlugins.getList();
```

### Getting a Specific Plugin

To retrieve a specific plugin by its ID:

```typescript
const plugin = await sdkAdmin.managePlugins.getById('pluginId');
```

### Creating a Plugin

To create a new plugin:

```typescript
const newPlugin = await sdkAdmin.managePlugins.create({
  name: 'My Plugin',
  appUrl: 'https://my-plugin.example.com',
  description: 'A custom plugin for my application',
  version: '1.0.0',
  // Optional fields
  subscribedEvents: [],
  microFrontends: [],
  cruds: [],
  injectables: [],
  navBarGroups: []
});
```

### Updating a Plugin

To update an existing plugin's information:

```typescript
const updatedPlugin = await sdkAdmin.managePlugins.update('pluginId', {
  version: '1.1.0',
  description: 'Updated description'
});
```

### Removing a Plugin

To remove a plugin:

```typescript
await sdkAdmin.managePlugins.remove('pluginId');
```

## Plugin Interfaces

### IPluginCreateParams

The create method accepts the following parameters:

```typescript
interface IPluginCreateParams {
  name: string;
  appUrl: string;
  description?: string;
  version?: string;
  url?: string;
  proxyUrl?: string;
  subscribedEvents?: Partial<IEventSubscriber>[];
  microFrontends?: Partial<IMicroFrontend>[];
  cruds?: Partial<IPluginCrud>[];
  injectables?: Partial<IInjectable>[];
  navBarGroups?: Partial<INavbarGroup>[];
}
```

### IPluginUpdateParams

The update method accepts partial updates:

```typescript
type IPluginUpdateParams = Partial<Omit<IPlugin, 'tenant' | 'user' | 'token' | 'auth' | '_id' | 'id' | 'createdAt' | 'updatedAt'>>;
```

## Usage Example

Here's a complete example of managing plugins:

```typescript
import QelosAdminSDK from '@qelos/sdk/dist/administrator';

// Initialize the admin SDK
const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://your-qelos-app.com',
  fetch: globalThis.fetch
});

// Authenticate as admin
await sdkAdmin.authentication.oAuthSignin({
  username: 'admin@example.com',
  password: 'password'
});

// Get all plugins
const plugins = await sdkAdmin.managePlugins.getList();
console.log(`Found ${plugins.length} plugins`);

// Create a new plugin
const newPlugin = await sdkAdmin.managePlugins.create({
  name: 'Analytics Plugin',
  appUrl: 'https://analytics.example.com',
  description: 'Provides analytics functionality',
  version: '1.0.0'
});

console.log(`Created plugin with ID: ${newPlugin._id}`);

// Update the plugin
const updatedPlugin = await sdkAdmin.managePlugins.update(newPlugin._id, {
  version: '1.0.1',
  description: 'Provides enhanced analytics functionality'
});

// Get specific plugin
const plugin = await sdkAdmin.managePlugins.getById(newPlugin._id);
console.log(`Plugin name: ${plugin.name}`);

// Remove the plugin
await sdkAdmin.managePlugins.remove(newPlugin._id);
console.log('Plugin removed');
```
