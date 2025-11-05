# Qelos Deployment Guide

This guide explains how to deploy Qelos using Helm charts, covering both local development and production deployments.

## Quick Links

- **Want to get started fast?** Follow the [Quick Start Guide](./deployment/quick-start.md) (~35 minutes)
- **New to Qelos?** Start with [GitHub Fork Setup](./deployment/github-fork-setup.md) to fork the repository
- **Setting up infrastructure?** See [Kubernetes Cluster Management](./deployment/kubernetes-cluster-management.md)
- **Ready to deploy?** Follow the [Deployment Process](./deployment/deployment-process.md)
- **Going to production?** Check the [Production Guide](./deployment/production-guide.md)

## Helm Chart Structure

The Qelos Helm chart is organized as follows:

```
helm/qelos/
├── Chart.yaml
├── values.yaml         # Default configuration values
├── values-env.yaml    # Environment-specific values
└── templates/
    ├── microservices.yaml
    └── _microservice.tpl
```

## Configuration

### Global Settings

The Helm chart provides several global configuration options in `values.yaml`:

```yaml
global:
  environment: development
  internalSecret: "your-internal-secret"
  redis:
    host: redis://redis-service
    port: 6379
  mongodb:
    deployInCluster: true    # Set to false for external MongoDB
    external:
      host: ""
      port: 27017
      database: qelos
```

### MongoDB Configuration

You can choose between deploying MongoDB within the cluster or using an external instance:

1. **In-Cluster MongoDB** (default):
```yaml
global:
  mongodb:
    deployInCluster: true
    internal:
      host: mongodb-service
      port: 27017
      database: qelos
```

2. **External MongoDB**:
```yaml
global:
  mongodb:
    deployInCluster: false
    external:
      host: "your-mongodb-host"
      port: 27017
      database: qelos
```

### Service Configuration

Each microservice can be configured independently:

```yaml
serviceName:
  image:
    repository: registry.github.com/qelos-io/qelos/service-name
    tag: latest
  host: service-name-service
  port: 9000
  environment:
    PORT: 9000
    MONGO_URI: mongodb://mongodb-service:27017/qelos
    REDIS_URL: redis://redis-service
    SECRETS_TOKEN: ${SERVICE_SECRET}
```

## Deployment Process

### 1. Prerequisites

- Kubernetes cluster (local or remote)
- Helm 3.x installed
- Access to container registry
- Environment variables file (`.env`)

### 2. Generate Helm Values

Before deployment, generate the environment-specific values:

```bash
node --env-file .env tools/ingest-helm-values/index.js
```

This creates `values-env.yaml` with environment-specific configurations.

### 3. Deploy

Deploy or upgrade Qelos using Helm:

```bash
helm upgrade --install qelos -f ./helm/qelos/values-env.yaml ./helm/qelos
```

Common deployment options:
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

## Production Considerations

1. **Security**:
   - Never commit secrets to version control
   - Use Kubernetes secrets for sensitive data
   - Configure proper network policies

2. **Resource Management**:
   - Adjust resource requests/limits based on workload
   - Configure horizontal pod autoscaling
   - Monitor resource usage

3. **High Availability**:
   - Deploy across multiple availability zones
   - Configure proper replica counts
   - Use persistent storage for stateful services

4. **Monitoring**:
   - Set up monitoring and alerting
   - Configure proper logging
   - Implement health checks

## Troubleshooting

Common issues and solutions:

1. **Pod Startup Issues**:
   ```bash
   kubectl describe pod <pod-name>
   kubectl logs <pod-name>
   ```

2. **Service Discovery Issues**:
   ```bash
   kubectl get svc
   kubectl describe svc <service-name>
   ```

3. **Configuration Issues**:
   - Verify values in `values-env.yaml`
   - Check environment variables
   - Validate service connectivity
