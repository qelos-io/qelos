global:
  showLogs: true
  environment: {{ .Values.ENVIRONMENT }}
  internalSecret: {{ .Values.INTERNAL_SECRET }}
  redis:
    host: redis://redis-service
    port: 6379
  mongodb:
    # Set to false to use external MongoDB
    deployInCluster: false
    # External MongoDB configuration (used when deployInCluster is false)
    external:
      host: ${MONGODB_HOST}
      port: ${MONGODB_PORT}
      database: ${MONGODB_DATABASE}
    # Internal MongoDB configuration (used when deployInCluster is true)
    internal:
      host: 
      port: 
      database: 

mongodb:
  enabled: true
  image:
    repository: mongo
    tag: latest
    pullPolicy: IfNotPresent
  persistence:
    enabled: true
    storageClass: ""
    accessModes:
      - ReadWriteOnce
    size: 10Gi
  volumePath: {{ .Values.MONGODB_VOLUME_PATH }}
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "500m"

redis:
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 150m
      memory: 256Mi

gateway:
  image:
    repository: registry.github.com/qelos-io/qelos/gateway
    tag: latest
  replicas: 2
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "200m"
  environment:
    INTERNAL_URL: localhost
    BASIC_TENANT: 0
    APPLICATION_URL: localhost:3000

auth:
  image:
    repository: registry.github.com/qelos-io/qelos/auth
    tag: latest
  host: auth-service
  port: 9000
  replicas: 2
  environment:
    JWT_SECRET: {{ .Values.JWT_SECRET }}
    REFRESH_TOKEN_SECRET: {{ .Values.REFRESH_TOKEN_SECRET }}
    SECRETS_TOKEN: {{ .Values.SECRETS_TOKEN }}
    PLUGINS_SERVICE_URL: plugins-service
    PLUGINS_SERVICE_PORT: 9006
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002
    CONTENT_SERVICE_URL: content-service
    CONTENT_SERVICE_PORT: 9001  

content:
  image:
    repository: registry.github.com/qelos-io/qelos/content
    tag: latest
  host: content-service
  port: 9001
  replicas: 2
  environment:
    IP: 0.0.0.0
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    BASIC_TENANT: 0

secrets:
  image:
    repository: registry.github.com/qelos-io/qelos/secrets
    tag: latest
  host: secrets-service
  port: 9002
  replicas: 2
  environment:
    IP: 0.0.0.0
    SECRET: {{ .Values.SECRETS_SERVICE_SECRET }}

nocode:
  image:
    repository: registry.github.com/qelos-io/qelos/no-code
    tag: latest
  replicas: 2
  host: nocode-service
  port: 9004
  environment:
    SECRETS_TOKEN: {{ .Values.NO_CODE_SERVICE_SECRET }}
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002
    PLUGINS_SERVICE_URL: plugins-service
    PLUGINS_SERVICE_PORT: 9006
    
admin:
  image:
    repository: registry.github.com/qelos-io/qelos/admin
    tag: latest
  replicas: 2
  host: admin-service
  port: 3001
  environment:
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    CONTENT_SERVICE_URL: content-service
    CONTENT_SERVICE_PORT: 9001
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002

plugins:
  image:
    repository: registry.github.com/qelos-io/qelos/plugins
    tag: latest
  replicas: 2
  host: plugins-service
  port: 9006
  environment:
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    SECRETS_TOKEN: {{ .Values.PLUGINS_SERVICE_SECRET }}
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002
    NO_CODE_SERVICE_URL: nocode-service
    NO_CODE_SERVICE_PORT: 9004

assets:
  image:
    repository: registry.github.com/qelos-io/qelos/assets
    tag: latest
  replicas: 2
  host: assets-service
  port: 9005
  resources:
    requests:
      cpu: 200m
      memory: 1Gi
    limits:
      cpu: 500m
      memory: 4Gi
  environment:
    SECRETS_TOKEN: {{ .Values.ASSETS_SERVICE_SECRET }}
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002
    PLUGINS_SERVICE_URL: plugins-service
    PLUGINS_SERVICE_PORT: 9006

drafts:
  image:
    repository: registry.github.com/qelos-io/qelos/drafts
    tag: latest
  replicas: 1
  host: drafts-service
  port: 9006
  environment:
    SECRETS_TOKEN: {{ .Values.DRAFTS_SERVICE_SECRET }}
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002
  
ai:
  image:
    repository: registry.github.com/qelos-io/qelos/ai
    tag: latest
  replicas: 2
  host: ai-service
  port: 9007
  environment:
    SECRETS_TOKEN: {{ .Values.AI_SERVICE_SECRET }}
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002
    PLUGINS_SERVICE_URL: plugins-service
    PLUGINS_SERVICE_PORT: 9006
    NO_CODE_SERVICE_URL: nocode-service
    NO_CODE_SERVICE_PORT: 9004
    

# Default resource settings for microservices
defaultResources: &defaultResources
  requests:
    memory: "128Mi"
    cpu: "50m"
  limits:
    memory: "256Mi"
    cpu: "150m"
