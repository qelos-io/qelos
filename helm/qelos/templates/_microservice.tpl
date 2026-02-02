{{- define "qelos.microservice" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .name }}
  labels:
    app: {{ .name }}
spec:
  replicas: {{ .values.replicas | default 2 }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: {{ (.values.rollingUpdate).maxSurge | default 1 }}
      maxUnavailable: {{ (.values.rollingUpdate).maxUnavailable | default 0 }}
  selector:
    matchLabels:
      app: {{ .name }}
  template:
    metadata:
      labels:
        app: {{ .name }}
        version: {{ .values.image.tag | quote }}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "{{ .values.port }}"
        prometheus.io/path: "/metrics"
    spec:
      terminationGracePeriodSeconds: {{ (.values.terminationGracePeriodSeconds) | default 30 }}
      containers:
        - name: {{ .name }}
          image: "{{ .values.image.repository }}:{{ .values.image.tag }}"
          imagePullPolicy: {{ .values.image.pullPolicy | default "IfNotPresent" }}
          ports:
            - containerPort: {{ .values.port }}
              name: http
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
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
          {{- with .values.readinessProbe }}
          readinessProbe:
            {{- toYaml . | nindent 12 }}
          {{- else }}
          readinessProbe:
            httpGet:
              path: /internal-api/health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            successThreshold: 1
            failureThreshold: 3
          {{- end }}
          {{- with .values.livenessProbe }}
          livenessProbe:
            {{- toYaml . | nindent 12 }}
          {{- else }}
          livenessProbe:
            httpGet:
              path: /internal-api/health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            successThreshold: 1
            failureThreshold: 3
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
  annotations:
    {{- if (.values.service).annotations }}
    {{- range $key, $value := .values.service.annotations }}
    {{ $key }}: {{ $value | quote }}
    {{- end }}
    {{- end }}
spec:
  type: {{ (.values.service).type | default "ClusterIP" }}
  ports:
    - port: {{ .values.port }}
      targetPort: {{ .values.port }}
      protocol: TCP
      name: {{ .name }}-http
  selector:
    app: {{ .name }}
---
{{- if not (.values.pdb).disabled }}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ .name }}-pdb
spec:
  minAvailable: {{ (.values.pdb).minAvailable | default 1 }}
  {{- if (.values.pdb).maxUnavailable }}
  maxUnavailable: {{ (.values.pdb).maxUnavailable }}
  {{- end }}
  selector:
    matchLabels:
      app: {{ .name }}
{{- end }}
{{- end -}}
