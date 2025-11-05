---
title: Installation & Setup
---

# {{ $frontmatter.title }}

This guide covers installing and setting up the Qelos Web SDK in your micro-frontend application.

## Installation

Install the Web SDK using npm, yarn, or pnpm:

```bash
npm install @qelos/web-sdk
```

```bash
yarn add @qelos/web-sdk
```

```bash
pnpm add @qelos/web-sdk
```

## Basic Setup

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Micro-Frontend</title>
</head>
<body>
    <div id="app">
        <h1>Loading...</h1>
    </div>

    <script type="module">
        import { authorize, code } from '@qelos/web-sdk';

        // Initialize authentication
        const userData = await authorize();
        
        document.getElementById('app').innerHTML = `
            <h1>Welcome, ${userData.user.fullName}!</h1>
            <p>Session Code: ${code}</p>
        `;
    </script>
</body>
</html>
```

### React Application

```tsx
// App.tsx
import { useEffect, useState } from 'react';
import { authorize, code } from '@qelos/web-sdk';

function App() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authorize()
      .then(data => {
        setUserData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Authorization failed:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome, {userData?.user?.fullName}!</h1>
      <p>Session Code: {code}</p>
    </div>
  );
}

export default App;
```

### Vue 3 Application

```vue
<!-- App.vue -->
<template>
  <div v-if="loading">Loading...</div>
  <div v-else>
    <h1>Welcome, {{ userData?.user?.fullName }}!</h1>
    <p>Session Code: {{ sessionCode }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { authorize, code } from '@qelos/web-sdk';

const userData = ref(null);
const loading = ref(true);
const sessionCode = ref(code);

onMounted(async () => {
  try {
    userData.value = await authorize();
  } catch (err) {
    console.error('Authorization failed:', err);
  } finally {
    loading.value = false;
  }
});
</script>
```

### Angular Application

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { authorize, code } from '@qelos/web-sdk';

@Component({
  selector: 'app-root',
  template: `
    <div *ngIf="loading">Loading...</div>
    <div *ngIf="!loading">
      <h1>Welcome, {{ userData?.user?.fullName }}!</h1>
      <p>Session Code: {{ sessionCode }}</p>
    </div>
  `
})
export class AppComponent implements OnInit {
  userData: any = null;
  loading = true;
  sessionCode = code;

  async ngOnInit() {
    try {
      this.userData = await authorize();
    } catch (err) {
      console.error('Authorization failed:', err);
    } finally {
      this.loading = false;
    }
  }
}
```

## Build Configuration

### Vite

If you're using Vite, no additional configuration is needed. The Web SDK works out of the box:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  // Your configuration
});
```

### Webpack

For Webpack projects, ensure you have proper module resolution:

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.ts', '.js'],
  },
  // Your other configuration
};
```

### Create React App

The Web SDK works seamlessly with Create React App without additional configuration.

## Environment Variables

You can configure your micro-frontend using environment variables:

```bash
# .env
VITE_API_URL=https://your-backend.com
VITE_APP_NAME=My Micro-Frontend
```

## Automatic Initialization

The Web SDK automatically initializes when imported:

1. Loads shared styles from the host application
2. Establishes communication channel with the host
3. Extracts the session `code` from URL parameters

You don't need to manually initialize the SDK - just import and use it.

## TypeScript Configuration

For TypeScript projects, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

## Verification

To verify the SDK is working correctly:

```typescript
import { code } from '@qelos/web-sdk';

console.log('Session code:', code);
// Should output: Session code: <unique-code>

if (code === 'default') {
  console.warn('Running outside of Qelos host - using default code');
}
```

## Troubleshooting

### SDK not receiving events

Make sure your application is loaded inside an iframe within a Qelos host application. The SDK requires the `postMessage` API for communication.

### Authorization fails

Check that:
1. The `code` parameter is present in the URL
2. Your backend endpoint `/api/authorize` is accessible
3. The token is valid and not expired

### Styles not loading

The shared styles are loaded automatically. If they're not appearing:
1. Check browser console for errors
2. Ensure the host application is sending style events
3. Verify the `#app-style` element is created in the DOM

## Next Steps

- [Learn about authentication](./authentication.md)
- [Explore event communication](./events.md)
- [See complete examples](./examples.md)
