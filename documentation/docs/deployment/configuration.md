# Configuration

## Global Settings

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

## MongoDB Configuration

### In-Cluster MongoDB (Default)
```yaml
global:
  mongodb:
    deployInCluster: true
    internal:
      host: mongodb-service
      port: 27017
      database: qelos
```

### External MongoDB
```yaml
global:
  mongodb:
    deployInCluster: false
    external:
      host: "your-mongodb-host"
      port: 27017
      database: qelos
```

## Service Configuration

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

## Resource Management

Default resource settings for microservices:

```yaml
defaultResources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```
