# QELOS - Build SaaS Applications with Ease

[![Qelos CI/CD](https://github.com/qelos-io/qelos/actions/workflows/main.yml/badge.svg)](https://github.com/qelos-io/qelos/actions/workflows/main.yml)

<div align="center">
  <a href="https://qelos.io" target="_blank">
    <img src="https://docs.qelos.io/qelos.svg" alt="QELOS Logo" width="200">
  </a>
  <p><strong>A powerful platform for creating multi-tenant SaaS applications with a built-in plugin system</strong></p>
</div>

## What is QELOS?

QELOS is a platform to create SaaS products with a set of tools for developers and non-developers to manage, edit, improve, and change SaaS products faster and easier.

### Key Features

- 🚀 **Multi-Tenant Architecture** - Built-in support for multi-tenancy with isolated workspaces and configurations
- 🔌 **Plugin System** - Extend your application with plugins and micro-frontends
- 🎨 **No-Code Builder** - Create and customize blueprints without writing code
- 🔒 **Built-in Security** - Authentication, authorization, and secrets management out of the box
- 📦 **Modern Tech Stack** - Vue 3, Node.js, MongoDB, Redis, and more
- 🌐 **API-First Design** - RESTful APIs and SDK for seamless integration

## Prerequisites

- **Node.js v20+**: The JavaScript runtime environment required to run QELOS
- **Docker**: For containerized development and deployment
- **MongoDB**: Database for storing application data (can be run via Docker)
- **Redis** (Optional): For caching and session management

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/qelos-io/qelos.git

# Install dependencies
npm install

# Build the packages
npm run build
```

### Development Mode

```bash
# With local MongoDB instance
npm run dev

# Create initial data (in a new terminal)
npm run populate-db
```

### Production Mode

```bash
npm start
```

### Default Login Credentials

| **Field**    | **Value**       |
| ------------ | --------------- |
| **Username** | `test@test.com` |
| **Password** | `admin`         |

## Dockerized Usage

### Setup Environment

```bash
cd compose

# For Linux or macOS
cp .env.example .env

# For all operating systems
npm run create-env
```

### Run with Docker Compose

```bash
cd compose
docker-compose up
```

### Scaling with Docker Compose

For scaled deployments with separate services:

```bash
cd compose
docker-compose -f docker-compose.scaled.yml up
```

## Kubernetes Deployment

### Prerequisites
- Docker Desktop with Kubernetes enabled
- kubectl
- Helm 3.x

### Local Development Setup

1. **Set up a Local Kubernetes Cluster**
   ```bash
   # Verify cluster is running
   kubectl cluster-info
   ```

2. **Install Helm (macOS)**
   ```bash
   brew install helm
   ```

3. **Deploy QELOS**
   ```bash
   # Generate Helm values
   node --env-file .env tools/ingest-helm-values/index.js
   
   # Deploy or upgrade
   helm upgrade --install qelos -f ./helm/qelos/values-env.yaml ./helm/qelos
   
   # Forward the gateway service port
   kubectl port-forward svc/gateway-service 3000:80
   ```

4. **Access the admin interface** at http://localhost:3000

## Project Structure

- `/apps` - Microservices and frontend applications
  - `/admin` - Admin frontend (Vue 3)
  - `/ai` - AI service for chat completion and AI integration
  - `/auth` - Authentication service
  - `/content` - Content management service
  - `/plugins` - Plugin management service
- `/packages` - Shared libraries and utilities
  - `/api-kit` - API utilities for backend services
  - `/global-types` - Shared TypeScript types
- `/documentation` - Project documentation
- `/compose` - Docker Compose configuration
- `/helm` - Kubernetes Helm charts

## Documentation

For comprehensive documentation, visit [docs.qelos.io](https://docs.qelos.io):

- [Installation Guide](https://docs.qelos.io/getting-started/installation.html)
- [Create Blueprints](https://docs.qelos.io/getting-started/create-blueprints.html)
- [Plugin Development](https://docs.qelos.io/getting-started/create-your-first-plugin.html)
- [Deployment Guide](https://docs.qelos.io/getting-started/deployment.html)

## Resources

- [Official Website](https://qelos.io)
- [Documentation](https://docs.qelos.io)
- [GitHub Repository](https://github.com/qelos-io/qelos)
- [LinkedIn](https://www.linkedin.com/company/qelos/about/)
