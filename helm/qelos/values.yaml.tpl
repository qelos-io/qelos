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
  # Global image tag for all services - override with Git SHA during deployment
  imageTag: {{ .Values.IMAGE_TAG | default "latest" }} 

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
      cpu: 20m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 256Mi

gateway:
  image:
    repository: ghcr.io/qelos-io/qelos/gateway
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 2
  resources:
    requests:
      memory: "160Mi"
      cpu: "30m"
    limits:
      memory: "320Mi"
      cpu: "200m"
  environment:
    INTERNAL_URL: gateway-service
    BASIC_TENANT: 0
    APPLICATION_URL: localhost:3000

auth:
  image:
    repository: ghcr.io/qelos-io/qelos/auth
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  host: auth-service
  port: 9000
  replicas: 2
  resources:
    requests:
      memory: "96Mi"
      cpu: "30m"
    limits:
      memory: "192Mi"
      cpu: "150m"
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
    ASSETS_SERVICE_URL: assets-service
    ASSETS_SERVICE_PORT: 9005
    BASIC_TENANT: 0

content:
  image:
    repository: ghcr.io/qelos-io/qelos/content
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  host: content-service
  port: 9001
  replicas: 2
  resources:
    requests:
      memory: "96Mi"
      cpu: "30m"
    limits:
      memory: "192Mi"
      cpu: "150m"
  environment:
    IP: 0.0.0.0
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    BASIC_TENANT: 0

secrets:
  image:
    repository: ghcr.io/qelos-io/qelos/secrets
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  host: secrets-service
  port: 9002
  replicas: 2
  resources:
    requests:
      memory: "96Mi"
      cpu: "30m"
    limits:
      memory: "192Mi"
      cpu: "150m"
  environment:
    IP: 0.0.0.0
    SECRET: {{ .Values.SECRETS_SERVICE_SECRET }}

nocode:
  image:
    repository: ghcr.io/qelos-io/qelos/no-code
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 2
  host: nocode-service
  port: 9004
  resources:
    requests:
      memory: "160Mi"
      cpu: "30m"
    limits:
      memory: "384Mi"
      cpu: "200m"
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
    repository: ghcr.io/qelos-io/qelos/admin
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 2
  host: admin-service
  port: 3001
  resources:
    requests:
      memory: "96Mi"
      cpu: "30m"
    limits:
      memory: "192Mi"
      cpu: "150m"
  environment:
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    CONTENT_SERVICE_URL: content-service
    CONTENT_SERVICE_PORT: 9001
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002

plugins:
  image:
    repository: ghcr.io/qelos-io/qelos/plugins
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 2
  host: plugins-service
  port: 9006
  resources:
    requests:
      memory: "192Mi"
      cpu: "30m"
    limits:
      memory: "384Mi"
      cpu: "200m"
  environment:
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    SECRETS_TOKEN: {{ .Values.PLUGINS_SERVICE_SECRET }}
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002
    NO_CODE_SERVICE_URL: nocode-service
    NO_CODE_SERVICE_PORT: 9004
    AI_SERVICE_URL: ai-service
    AI_SERVICE_PORT: 9007

assets:
  image:
    repository: ghcr.io/qelos-io/qelos/assets
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 2
  host: assets-service
  port: 9005
  resources:
    requests:
      cpu: 30m
      memory: 256Mi
    limits:
      cpu: 200m
      memory: 512Mi
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
    repository: ghcr.io/qelos-io/qelos/drafts
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 1
  host: drafts-service
  port: 9006
  resources:
    requests:
      memory: "160Mi"
      cpu: "30m"
    limits:
      memory: "320Mi"
      cpu: "200m"
  environment:
    SECRETS_TOKEN: {{ .Values.DRAFTS_SERVICE_SECRET }}
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    SECRETS_SERVICE_URL: secrets-service
    SECRETS_SERVICE_PORT: 9002
  
ai:
  image:
    repository: ghcr.io/qelos-io/qelos/ai
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 2
  host: ai-service
  port: 9007
  resources:
    requests:
      cpu: 30m
      memory: 256Mi
    limits:
      cpu: 300m
      memory: 512Mi
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

mcp:
  image:
    repository: ghcr.io/qelos-io/qelos/mcp
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 2
  host: mcp-service
  port: 9010
  resources:
    requests:
      memory: "192Mi"
      cpu: "30m"
    limits:
      memory: "384Mi"
      cpu: "200m"
  environment:
    AUTH_SERVICE_URL: auth-service
    AUTH_SERVICE_PORT: 9000
    CONTENT_SERVICE_URL: content-service
    CONTENT_SERVICE_PORT: 9001
    GATEWAY_SERVICE_URL: gateway-service
    GATEWAY_SERVICE_PORT: 80

payments:
  image:
    repository: ghcr.io/qelos-io/qelos/payments
    # Leave empty to inherit global.imageTag (set via --set global.imageTag during deploy)
    tag: ""
    pullPolicy: Always
  replicas: 2
  host: payments-service
  port: 9008
  resources:
    requests:
      memory: "160Mi"
      cpu: "30m"
    limits:
      memory: "320Mi"
      cpu: "200m"
  environment:
    PLUGINS_SERVICE_URL: plugins-service
    PLUGINS_SERVICE_PORT: 9006
    CONTENT_SERVICE_URL: content-service
    CONTENT_SERVICE_PORT: 9001
    

# Default resource settings for microservices
defaultResources: &defaultResources
  requests:
    memory: "128Mi"
    cpu: "50m"
  limits:
    memory: "256Mi"
    cpu: "150m"

# Zero-downtime deployment configuration
defaultDeployment: &defaultDeployment
  # Rolling update strategy - allows zero-downtime deployments
  rollingUpdate:
    maxSurge: "25%"        # Can create 25% more pods during update
    maxUnavailable: "25%"  # Can take down 25% of pods during update
  # Health check configuration
  readinessProbe:
    httpGet:
      path: /internal-api/health
      port: http
    initialDelaySeconds: 10
    periodSeconds: 5
    timeoutSeconds: 3
    successThreshold: 1
    failureThreshold: 3
  livenessProbe:
    httpGet:
      path: /internal-api/health
      port: http
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    successThreshold: 1
    failureThreshold: 3
  # Graceful shutdown
  terminationGracePeriodSeconds: 30
  # Pod Disruption Budget
  pdb:
    minAvailable: 1  # Always keep at least 1 pod running
    # To disable PDB for a service, set:
    # pdb:
    #   disabled: true
  # Service configuration
  service:
    type: ClusterIP
    # Additional service annotations (e.g., for load balancers)
    # annotations:
    #   service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    #   service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"

# Image pull policy is now set per service (Always) to ensure new images are pulled
