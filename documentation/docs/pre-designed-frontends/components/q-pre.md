---
title: Q Pre Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<q-pre>` component displays pre-formatted text content with proper HTML escaping and line break handling. It's ideal for displaying code snippets, logs, JSON data, or any multi-line text content that needs to preserve formatting and whitespace.

## Usage

```html
<q-pre :value="textContent"></q-pre>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | String | '' | The text content to display in pre-formatted style |

## Features

- **HTML Escaping**: Automatically escapes HTML characters (`&`, `<`, `>`) to prevent XSS attacks and display raw text
- **Line Break Preservation**: Converts newline characters (`\n`) to `<br/>` tags for proper display
- **White Space Preservation**: Uses `white-space: pre-wrap` CSS to maintain formatting while allowing text wrapping
- **Safe Rendering**: Uses `v-html` with sanitized content to render formatted text

## Examples

### Basic Usage

```html
<q-pre value="Hello World"></q-pre>
```

### Multi-line Text

```html
<template>
  <q-pre :value="logContent"></q-pre>
</template>

<script setup>
import { ref } from 'vue';

const logContent = ref(`[INFO] Application started
[DEBUG] Loading configuration
[INFO] Server listening on port 3000
[ERROR] Connection timeout`);
</script>
```

### Displaying JSON Data

```html
<template>
  <div>
    <h3>API Response</h3>
    <q-pre :value="formattedJson"></q-pre>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const apiResponse = ref({
  status: 'success',
  data: {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com'
  }
});

const formattedJson = computed(() => 
  JSON.stringify(apiResponse.value, null, 2)
);
</script>
```

### Displaying Code Snippets

```html
<template>
  <div>
    <h3>Example Code</h3>
    <q-pre :value="codeSnippet"></q-pre>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const codeSnippet = ref(`function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));`);
</script>
```

### Displaying Error Messages

```html
<template>
  <el-card>
    <template #header>
      <span>Error Details</span>
    </template>
    <q-pre :value="errorStack"></q-pre>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';

const errorStack = ref(`Error: Cannot read property 'name' of undefined
    at getUserName (user.js:45:12)
    at processUser (app.js:123:5)
    at main (index.js:10:3)`);
</script>
```

### With Dynamic Content

```html
<template>
  <div>
    <el-input 
      v-model="userInput" 
      type="textarea" 
      :rows="4"
      placeholder="Enter text to preview"
    ></el-input>
    <h4>Preview:</h4>
    <q-pre :value="userInput"></q-pre>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const userInput = ref('');
</script>
```

### Displaying API Logs

```html
<template>
  <div>
    <h3>Request Logs</h3>
    <q-pre :value="requestLogs"></q-pre>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const requestLogs = ref(`GET /api/users - 200 OK - 45ms
POST /api/login - 401 Unauthorized - 12ms
GET /api/profile - 200 OK - 23ms
PUT /api/settings - 200 OK - 67ms`);
</script>
```

### With Styling Container

```html
<template>
  <el-card class="code-container">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>Configuration</span>
        <copy-to-clipboard :text="configText" button-size="small"></copy-to-clipboard>
      </div>
    </template>
    <q-pre :value="configText"></q-pre>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';

const configText = ref(`{
  "port": 3000,
  "host": "localhost",
  "database": {
    "url": "mongodb://localhost:27017",
    "name": "myapp"
  }
}`);
</script>

<style scoped>
.code-container {
  background-color: #f5f5f5;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}
</style>
```

## Security

The component automatically escapes HTML characters to prevent XSS attacks:
- `&` becomes `&amp;`
- `<` becomes `&lt;`
- `>` is implicitly handled through the `<` escaping

This makes it safe to display user-generated content or untrusted data.

## Use Cases

- **Log Viewers**: Display application logs with preserved formatting
- **Code Display**: Show code snippets without syntax highlighting
- **JSON Viewers**: Display formatted JSON data
- **Error Messages**: Show stack traces and error details
- **Configuration Files**: Display configuration content
- **API Responses**: Show raw API response data
- **Debug Information**: Display debug output with proper formatting

## Comparison with Monaco Component

Use `<q-pre>` when you need:
- Simple text display without editing
- Lightweight component with minimal overhead
- Quick rendering of formatted text

Use `<monaco>` when you need:
- Syntax highlighting
- Code editing capabilities
- Advanced features like IntelliSense

---

© Velocitech LTD. All rights reserved.
