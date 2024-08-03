---
title: Managing Plugins
---

# {{ $frontmatter.title }}

This section provides an overview of managing plugins using the Qelos SDK. The examples demonstrate how to create, update, remove, and retrieve plugin information, enabling administrators to effectively manage plugins.

## Creating a Plugin

To create a new plugin, use the following code:

```bash
await sdkAdmin.managePlugins.create({ name: 'New Plugin', version: '1.0.0' });
```

## Updating a Plugin

To update an existing plugin's information, use the following code:

```bash
await sdkAdmin.managePlugins.update('pluginId', { version: '1.1.0' });
```

## Removing a Plugin

To remove a plugin, use the following code:

```bash
await sdkAdmin.managePlugins.remove('pluginId');
```

## Getting List of Plugins

To get a list of all plugins, use the following code:

```bash
const plugins = await sdkAdmin.managePlugins.getList();
```
