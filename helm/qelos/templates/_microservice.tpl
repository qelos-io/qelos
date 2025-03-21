{{- define "qelos.microservice" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .name }}
  labels:
    app: {{ .name }}
spec:
  replicas: {{ .values.replicas }}
  selector:
    matchLabels:
      app: {{ .name }}
  template:
    metadata:
      labels:
        app: {{ .name }}
    spec:
      containers:
        - name: {{ .name }}
          image: "{{ .values.image.repository }}:{{ .values.image.tag }}"
          ports:
            - containerPort: 3000
              name: http
          env:
            - name: IP
              value: "0.0.0.0"
            - name: REDIS_HOST
              value: {{ .global.redis.host }}
            - name: REDIS_PORT
              value: "{{ .global.redis.port }}"
            - name: MONGO_URI
              value: {{ if .global.mongodb.deployInCluster }}"mongodb://{{ .global.mongodb.internal.host }}:{{ .global.mongodb.internal.port }}/{{ .global.mongodb.internal.database }}"{{ else }}"{{ .global.mongodb.connectionString }}"{{ end }}
          resources:
            {{- $defaultResources := dict "requests" (dict "memory" "128Mi" "cpu" "100m") "limits" (dict "memory" "256Mi" "cpu" "200m") }}
            {{- with .values.resources | default $defaultResources }}
            {{- toYaml . | nindent 12 }}
            {{- end }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ .name }}-service
  labels:
    app: {{ .name }}
spec:
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
      name: http
  selector:
    app: {{ .name }}
{{- end -}}