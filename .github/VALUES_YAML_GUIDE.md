# Creating the values.yaml File for GitHub Actions

This guide explains how to create a proper values.yaml file for use with GitHub Actions and Helm deployment.

## Template File

A template file is provided at `helm/qelos/values.yaml.github.tpl`. This template includes:

- GitHub Container Registry image paths (`ghcr.io/{{ .Values.GITHUB_USERNAME }}/qelos/...`)
- Placeholders for secrets and configuration values
- Service configurations for all microservices

## Creating Your values.yaml

1. Copy the template file:
   ```bash
   cp helm/qelos/values.yaml.github.tpl helm/qelos/values.yaml
   ```

2. Replace the placeholders with your actual values:
   - `{{ .Values.ENVIRONMENT }}` - Your environment (e.g., production, staging)
   - `{{ .Values.INTERNAL_SECRET }}` - Your internal secret for service-to-service communication
   - `{{ .Values.GITHUB_USERNAME }}` - Your GitHub username or organization name
   - `{{ .Values.JWT_SECRET }}` - Secret for JWT token generation
   - `{{ .Values.REFRESH_TOKEN_SECRET }}` - Secret for refresh token generation
   - `{{ .Values.SECRETS_TOKEN }}` - Secret for the secrets service
   - `{{ .Values.SECRETS_SERVICE_SECRET }}` - Secret for the secrets service
   - `{{ .Values.NO_CODE_SERVICE_SECRET }}` - Secret for the no-code service
   - `{{ .Values.PLUGINS_SERVICE_SECRET }}` - Secret for the plugins service
   - `{{ .Values.ASSETS_SERVICE_SECRET }}` - Secret for the assets service
   - `{{ .Values.DRAFTS_SERVICE_SECRET }}` - Secret for the drafts service
   - `{{ .Values.AI_SERVICE_SECRET }}` - Secret for the AI service
   - `${MONGODB_HOST}`, `${MONGODB_PORT}`, `${MONGODB_DATABASE}` - MongoDB connection details
   - `{{ .Values.MONGODB_VOLUME_PATH }}` - Path for MongoDB volume

3. Configure MongoDB:
   - For external MongoDB: Keep `deployInCluster: false` and fill in the external connection details
   - For in-cluster MongoDB: Set `deployInCluster: true` and configure the internal settings

## Adding to GitHub Secrets

Once you've created your values.yaml file, add it as a GitHub secret:

1. Go to your GitHub repository
2. Click on "Settings"
3. In the left sidebar, click on "Secrets and variables" > "Actions"
4. Click on "New repository secret"
5. Add the secret:
   - Name: `HELM_VALUES_YAML`
   - Value: [Paste the entire contents of your values.yaml file]
6. Click "Add secret"

## Important Notes

- Keep your values.yaml file secure as it contains sensitive information
- Make sure all required placeholders are replaced with actual values
- The GitHub Actions workflow will use this secret to create the values.yaml file during deployment
- You can update the secret whenever you need to change configuration values
