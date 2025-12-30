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
      maxSurge: 1
      maxUnavailable: 0
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
          {{- if ne (.values.enableHealthProbes | default true | toString) "false" }}
          readinessProbe:
            httpGet:
              path: {{ .values.healthCheckPath | default "/internal-api/health" }}
              port: {{ .values.port }}
            initialDelaySeconds: {{ (.values.readinessProbe).initialDelaySeconds | default 15 }}
            periodSeconds: {{ (.values.readinessProbe).periodSeconds | default 5 }}
            timeoutSeconds: {{ (.values.readinessProbe).timeoutSeconds | default 3 }}
            successThreshold: {{ (.values.readinessProbe).successThreshold | default 1 }}
            failureThreshold: {{ (.values.readinessProbe).failureThreshold | default 3 }}
          livenessProbe:
            httpGet:
              path: {{ .values.healthCheckPath | default "/internal-api/health" }}
              port: {{ .values.port }}
            initialDelaySeconds: {{ (.values.livenessProbe).initialDelaySeconds | default 45 }}
            periodSeconds: {{ (.values.livenessProbe).periodSeconds | default 10 }}
            timeoutSeconds: {{ (.values.livenessProbe).timeoutSeconds | default 5 }}
            failureThreshold: {{ (.values.livenessProbe).failureThreshold | default 3 }}
          {{- end }}
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
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ .name }}-pdb
spec:
  minAvailable: {{ (.values.pdb).minAvailable | default 1 }}
  selector:
    matchLabels:
      app: {{ .name }}
{{- end -}}
