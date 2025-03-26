# Deployment Process

## Prerequisites

Before deploying Qelos, ensure you have:

- Kubernetes cluster (local or remote)
- Helm 3.x installed
- Access to container registry
- Environment variables file (`.env`)

## Step-by-Step Guide

### 1. Generate Helm Values

Generate environment-specific values:

```bash
node --env-file .env tools/ingest-helm-values/index.js
```

This creates `values-env.yaml` with your environment-specific configurations.

### 2. Deploy

Deploy or upgrade Qelos using Helm:

```bash
helm upgrade --install qelos -f ./helm/qelos/values-env.yaml ./helm/qelos
```

### 3. Deployment Options

```bash
# Dry run to verify configuration
helm upgrade --install --dry-run qelos -f ./helm/qelos/values-env.yaml ./helm/qelos

# Deploy to specific namespace
helm upgrade --install -n your-namespace qelos -f ./helm/qelos/values-env.yaml ./helm/qelos

# Set specific values during deployment
helm upgrade --install qelos -f ./helm/qelos/values-env.yaml \
  --set global.environment=production \
  --set auth.environment.SECRETS_TOKEN=your-secret \
  ./helm/qelos
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods

# View service logs
kubectl logs -f deployment/gateway-deployment

# Port forward gateway service (for local access)
kubectl port-forward svc/gateway-service 3000:80
```
