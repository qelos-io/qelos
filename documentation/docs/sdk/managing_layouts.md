---
title: Managing Layouts
---

# {{ $frontmatter.title }}

This section provides an overview of managing layouts using the Qelos SDK. Layouts in Qelos define the structure and appearance of your application's pages. The SDK provides methods for both regular users and administrators to work with layouts.

## Using Layouts in the SDK

The SDK provides the `layouts` module for working with application layouts. This module allows you to retrieve layouts for different parts of your application.

### Getting a Layout

To retrieve a layout by its kind:

```typescript
import { LayoutKind } from '@qelos/sdk';

const indexLayout = await sdk.layouts.getLayout(LayoutKind.INDEX);
```

The SDK supports several layout kinds through the `LayoutKind` enum:

```typescript
enum LayoutKind {
  INDEX = "index",
  SEARCH = "search",
  TAG = "tag",
  CATEGORY = "category",
  POST = "post",
}
```

### Layout Structure

Layouts in Qelos have a structured format that includes content components and connected data:

```typescript
interface ILayout {
  kind: LayoutKind;
  connectedData: Array<{
    kind: LayoutConnectedDataKind;
    data?: any;
    identifier: string;
    reference: string;
    context?: any;
  }>;
  content: ILayoutContent[];
}

interface ILayoutContent {
  component: string;
  predefined: boolean;
  stick?: boolean;
  classes: string;
  children?: ILayoutContent[];
  props: {
    [key: string]: any;
  };
}
```

The `connectedData` property can reference different types of data sources defined by the `LayoutConnectedDataKind` enum:

```typescript
enum LayoutConnectedDataKind {
  MENU = "menu",
  BLOCK = "block",
  HTTP = "http",
  POSTS = "posts",
  CATEGORY_POSTS = "categoryPosts",
  CATEGORY = "category",
  POST = "post",
}
```

## Admin Layout Management

### Creating a Layout

As an administrator, you can create new layouts using the admin SDK:

```typescript
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
