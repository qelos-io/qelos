---
title: Managing Layouts
---

# {{ $frontmatter.title }}

This section provides an overview of managing layouts using the Qelos SDK. The examples demonstrate how to create, update, remove, and retrieve layout information, enabling administrators to effectively manage layouts.

## Creating a Layout

To create a new layout, use the following code:

```bash
await sdkAdmin.manageLayouts.create({ kind: 'layoutKind', data: { layout: 'data' } });
```

## Updating a Layout

To update an existing layout's information, use the following code:

```bash
await sdkAdmin.manageLayouts.update('layoutKind', { data: { layout: 'newData' } });
```

## Removing a Layout

To remove a layout, use the following code:

```bash
await sdkAdmin.manageLayouts.remove('layoutKind');
```

## Getting List of Layouts

To get a list of all layouts, use the following code:

```bash
const layouts = await sdkAdmin.manageLayouts.getList();
```
