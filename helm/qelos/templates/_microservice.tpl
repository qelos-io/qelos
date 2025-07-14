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
      annotations:
        # This timestamp annotation forces pod recreation on helm upgrade
        rollme: {{ randAlphaNum 10 | quote }}
    spec:
      containers:
        - name: {{ .name }}
          image: "{{ .values.image.repository }}:{{ .values.image.tag }}"
          ports:
            - containerPort: {{ .values.port }}
              name: http
          env:
            - name: INTERNAL_SECRET
              value: "{{ .global.internalSecret }}"
            - name: SHOW_LOGS
              value: "{{ .global.showLogs }}"
            - name: IP
              value: "0.0.0.0"
            - name: PORT
              value: "{{ .values.port }}"
            - name: REDIS_HOST
              value: {{ .global.redis.host }}
            - name: REDIS_PORT
              value: "{{ .global.redis.port }}"
            - name: MONGO_URI
              value: {{ .global.mongodb.url }}
            {{- with .values.environment }}
            {{- range $key, $value := . }}
            - name: {{ $key }}
              value: "{{ $value }}"
            {{- end }}
            {{- end }}
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
    - port: {{ .values.port }}
      targetPort: {{ .values.port }}
      protocol: TCP
      name: {{ .name }}-http
  selector:
    app: {{ .name }}
{{- end -}}