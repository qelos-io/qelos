---
title: Managing Blocks
---
# Managing Blocks

This section covers how to manage content blocks using the Qelos SDK. Blocks are reusable content components that can be used across your application.

## Block Methods

The `blocks` module in the Qelos SDK provides several methods for managing content blocks:

### Getting a List of Blocks

To retrieve a list of all available blocks:

```typescript
const blocks = await sdk.blocks.getList();
```

This returns an array of `IBlock` objects containing details about each block.

### Getting a Specific Block

To retrieve details about a specific block:

```typescript
const block = await sdk.blocks.getBlock(blockId);
```

### Creating a New Block

To create a new content block:

```typescript
const newBlock = await sdk.blocks.create({
  name: "Footer Content",
  description: "Standard footer content for all pages",
  content: "<footer><p>&copy; 2025 My Company</p></footer>",
  contentType: "html"
});
```

### Updating a Block

To update an existing block:

```typescript
const updatedBlock = await sdk.blocks.update(blockId, {
  content: "<footer><p>&copy; 2025 My Company, Inc.</p></footer>",
  description: "Updated footer content with Inc."
});
```

### Removing a Block

To remove a block:

```typescript
await sdk.blocks.remove(blockId);
```

## Block Interface

The SDK defines blocks using the following interface:

```typescript
interface IBlock {
  name: string;
  description?: string;
  content: string;
  contentType?: 'content' | 'html';
  [key: string]: any;
}
```

### Properties

- **name**: The name of the block (required)
- **description**: Optional description of the block's purpose
- **content**: The actual content of the block (HTML, text, or other format)
- **contentType**: Specifies the type of content - can be 'content' (default) or 'html'
- **Additional properties**: The interface allows for additional custom properties

## Usage Example

Here's a complete example of how to use the blocks module:

```typescript
import { QelosSDK } from '@qelos/sdk';

// Initialize the SDK
const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-app.com',
});

// Authenticate the user
await sdk.authentication.oAuthSignin({
  username: 'user@example.com',
  password: 'password'
});

// Get all blocks
const blocks = await sdk.blocks.getList();
console.log(`Found ${blocks.length} blocks`);

// Create a new block
const headerBlock = await sdk.blocks.create({
  name: "Header",
  description: "Main site header with navigation",
  content: `
    <header>
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </header>
  `,
  contentType: "html"
});

console.log(`Created new block with ID: ${headerBlock._id}`);

// Update the block
const updatedBlock = await sdk.blocks.update(headerBlock._id, {
  content: `
    <header>
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/blog">Blog</a></li>
        </ul>
      </nav>
    </header>
  `
});

console.log(`Updated block with new content`);
```
