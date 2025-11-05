---
title: Installation & Setup
---

# {{ $frontmatter.title }}

This guide covers installing Plugin Play and setting up your first plugin.

## Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm
- A Qelos application (for integration)
- Redis (optional, for caching)

## Installation

### Create a New Project

```bash
mkdir my-qelos-plugin
cd my-qelos-plugin
npm init -y
```

### Install Plugin Play

```bash
npm install @qelos/plugin-play
```

### Install TypeScript (Recommended)

```bash
npm install --save-dev typescript @types/node
npx tsc --init
```

### Project Structure

Create the following structure:

```
my-qelos-plugin/
├── src/
│   └── index.ts
├── public/           # Optional: for micro-frontend files
├── cert/            # Optional: for HTTPS in development
├── package.json
├── tsconfig.json
└── .env
```

## Basic Setup

### 1. Create Your Main File

Create `src/index.ts`:

```typescript
import { start, configure } from '@qelos/plugin-play';

// Configure the plugin
configure({
  name: 'My Plugin',
  version: '1.0.0',
  description: 'My first Qelos plugin',
  manifestUrl: '/manifest.json',
  proxyPath: '/api/proxy'
}, {
  qelosUrl: process.env.QELOS_URL,
  qelosUsername: process.env.QELOS_USERNAME,
  qelosPassword: process.env.QELOS_PASSWORD,
  port: 3000
});

// Start the server
start().then(() => {
  console.log('Plugin is running!');
});
```

### 2. Configure Environment Variables

Create `.env`:

```bash
# Qelos Connection
QELOS_URL=https://your-qelos-app.com
QELOS_USERNAME=plugin-user@example.com
QELOS_PASSWORD=your-password

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Security (generate secure random strings)
REFRESH_TOKEN_SECRET=your-refresh-token-secret
ACCESS_TOKEN_SECRET=your-access-token-secret
USER_PAYLOAD_SECRET=your-user-payload-secret

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: Static files
STATIC_ROOT=public
STATIC_PREFIX=/
```

### 3. Update package.json

Add scripts to your `package.json`:

```json
{
  "name": "my-qelos-plugin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "create-certs": "node -e \"require('@qelos/plugin-play/create-cert')\""
  },
  "dependencies": {
    "@qelos/plugin-play": "^3.10.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^4.9.5",
    "@types/node": "^20.0.0"
  }
}
```

### 4. Configure TypeScript

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Development Setup

### Install Development Tools

```bash
npm install --save-dev tsx nodemon
```

### Create HTTPS Certificates (Development)

For local HTTPS development:

```bash
npm run create-certs
```

This creates self-signed certificates in the `cert/` directory.

### Run in Development Mode

```bash
npm run dev
```

Your plugin should now be running at `https://localhost:3000` (or `http://localhost:3000` if no certificates).

## Verify Installation

### Check the Manifest

Visit `http://localhost:3000/manifest.json` to see your plugin manifest:

```json
{
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "My first Qelos plugin",
  "appUrl": "http://localhost:3000",
  "proxyUrl": "http://localhost:3000/api/proxy",
  "manifestUrl": "/manifest.json",
  "subscribedEvents": [],
  "microFrontends": [],
  "cruds": [],
  "injectables": [],
  "navBarGroups": []
}
```

### Test the Health Endpoint

Plugin Play automatically creates a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

## Adding Your First Endpoint

Update `src/index.ts`:

```typescript
import { start, configure, addEndpoint } from '@qelos/plugin-play';

configure({
  name: 'My Plugin',
  version: '1.0.0',
  description: 'My first Qelos plugin',
  manifestUrl: '/manifest.json',
  proxyPath: '/api/proxy'
}, {
  qelosUrl: process.env.QELOS_URL,
  qelosUsername: process.env.QELOS_USERNAME,
  qelosPassword: process.env.QELOS_PASSWORD
});

// Add a simple endpoint
addEndpoint('/api/hello', {
  method: 'GET',
  handler: async (request, reply) => {
    return { 
      message: 'Hello from my plugin!',
      timestamp: new Date().toISOString()
    };
  }
});

start();
```

Test it:

```bash
curl http://localhost:3000/api/hello
```

## Register with Qelos

To register your plugin with a Qelos application:

1. Log in to your Qelos admin panel
2. Navigate to Plugins
3. Click "Add Plugin"
4. Enter your plugin's manifest URL: `http://localhost:3000/manifest.json`
5. Save

Your plugin is now registered and can receive events from the Qelos platform!

## Production Setup

### Environment Configuration

For production, use proper environment variables:

```bash
# Production .env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

QELOS_URL=https://your-qelos-app.com
QELOS_USERNAME=plugin-user@example.com
QELOS_PASSWORD=secure-password

# Use strong secrets in production
REFRESH_TOKEN_SECRET=<generate-secure-random-string>
ACCESS_TOKEN_SECRET=<generate-secure-random-string>
USER_PAYLOAD_SECRET=<generate-secure-random-string>

# Production Redis
REDIS_URL=redis://your-redis-server:6379
```

### Build for Production

```bash
npm run build
npm start
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY public ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t my-qelos-plugin .
docker run -p 3000:3000 --env-file .env my-qelos-plugin
```

## Troubleshooting

### Port Already in Use

Change the port in your `.env` file:

```bash
PORT=3001
```

### Cannot Connect to Qelos

Verify your credentials:
```bash
curl -X POST https://your-qelos-app.com/api/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"plugin-user@example.com","password":"your-password"}'
```

### HTTPS Certificate Errors

For development, you can disable HTTPS by removing the `cert/` directory.

### Redis Connection Issues

Redis is optional. If you don't need caching, you can omit the `REDIS_URL` environment variable.

## Next Steps

- [Learn about configuration options](./configuration.md)
- [Add API endpoints](./endpoints.md)
- [Subscribe to events](./events.md)
- [Create micro-frontends](./micro-frontends.md)
- [Explore complete examples](./examples.md)
