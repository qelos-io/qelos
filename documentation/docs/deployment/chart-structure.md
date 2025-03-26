# Helm Chart Structure

## Directory Organization

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

## Key Components

### Chart.yaml
Defines the chart metadata, version, and dependencies.

### values.yaml
Contains the default configuration values for all components of Qelos.

### values-env.yaml
Environment-specific configuration values, generated from your `.env` file.

### Templates
- `microservices.yaml`: Main template for deploying Qelos microservices
- `_microservice.tpl`: Helper template for microservice configuration
