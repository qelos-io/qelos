---
title: Installation
---

# {{ $frontmatter.title }}

In this section, we will cover the installation and setup of the Qelos SDK for both regular users and administrators. This includes instructions for different environments such as browsers and Node.js, with specific configurations for each use case.

---

To install the Qelos SDK, use the following npm command:

```bash
npm install @qelos/sdk
```

## Regular User Installation
---

### Browser Environment

Create an instance of the Qelos SDK for a regular user in a browser environment.

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://yourdomain.com', // Use 'http://localhost:3000' if running locally
  fetch: window.fetch
});

export default sdk;
```

### Node.js Environment

Create an instance of the Qelos SDK for a regular user in a Node.js environment.

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://yourdomain.com', // Use 'http://localhost:3000' if running locally
  fetch: globalThis.fetch // Node.js 18+ has built-in fetch
});

export default sdk;
```

### Node.js Environment with node-fetch

Create an instance of the Qelos SDK for a regular user in a Node.js environment using node-fetch.

```typescript
import QelosSDK from '@qelos/sdk';
import nodeFetch from 'node-fetch';

const sdk = new QelosSDK({
  appUrl: 'https://yourdomain.com', // Use 'http://localhost:3000' if running locally
  fetch: nodeFetch
});

export default sdk;
```

## Administrator Installation

---

### Browser Environment

Create an instance of the Qelos SDK for an administrator in a browser environment.

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://yourdomain.com', // Use 'http://localhost:3000' if running locally
  fetch: window.fetch
});

export default sdkAdmin;
```

### Node.js Environment

Create an instance of the Qelos SDK for an administrator in a Node.js environment.

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://yourdomain.com', // Use 'http://localhost:3000' if running locally
  fetch: globalThis.fetch // Node.js 18+ has built-in fetch
});

export default sdkAdmin;
```

### Node.js Environment with node-fetch

Create an instance of the Qelos SDK for an administrator in a Node.js environment using node-fetch.

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';
import nodeFetch from 'node-fetch';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://yourdomain.com', // Use 'http://localhost:3000' if running locally
  fetch: nodeFetch
});

export default sdkAdmin;
```

<!--
To install the Qelos SDK, use the following npm command:

```bash
npm install @qelos/sdk
```

## Regular User



Create an instance of the Qelos SDK for a regular user.

```bash
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://yourdomain.com', // Use 'https://localhost:3000' if running locally
  fetch: window.fetch // Use globalThis.fetch if using Node.js
});

export default sdk;
```

## Administrator

Create an instance of the Qelos SDK for an administrator.

```bash
import QelosAdminSDK from '@qelos/sdk/administrator';
import nodeFetch from 'node-fetch';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://yourdomain.com', // Use 'https://localhost:3000' if running locally
  fetch: nodeFetch // Use globalThis.fetch if using Node.js
});

export default sdkAdmin;
``` -->
