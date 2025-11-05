# Forking Qelos Repository on GitHub

This guide walks you through forking the Qelos repository and setting it up for your own deployment with GitHub Actions and Kubernetes.

## Prerequisites

- GitHub account
- Git installed locally
- Access to a Kubernetes cluster
- Basic understanding of GitHub Actions and Kubernetes

## Step 1: Fork the Repository

1. Navigate to the Qelos repository on GitHub: `https://github.com/qelos-io/qelos`
2. Click the **Fork** button in the top-right corner
3. Select your GitHub account or organization as the destination
4. Optionally, customize the repository name and description
5. Click **Create fork**

## Step 2: Clone Your Fork

Clone your forked repository to your local machine:

```bash
git clone https://github.com/YOUR-USERNAME/qelos.git
cd qelos
```

Add the original repository as an upstream remote to sync updates:

```bash
git remote add upstream https://github.com/qelos-io/qelos.git
```

## Step 3: Enable GitHub Container Registry

GitHub Container Registry (GHCR) is used to store Docker images for your services.

1. Go to your GitHub account **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**
2. Click **Generate new token** > **Generate new token (classic)**
3. Give it a descriptive name (e.g., "Qelos GHCR Access")
4. Select the following scopes:
   - `write:packages` (includes `read:packages`)
   - `delete:packages` (optional, for cleanup)
   - `repo` (if your repository is private)
5. Click **Generate token** and copy it immediately
6. Save this token securely - you'll need it for Docker login

### Configure Docker to Use GHCR

```bash
echo YOUR_TOKEN | docker login ghcr.io -u YOUR-USERNAME --password-stdin
```

## Step 4: Configure Repository Secrets

Your forked repository needs several secrets for CI/CD to work properly.

### Required Secrets

Navigate to your repository **Settings** > **Secrets and variables** > **Actions** and add the following secrets:

#### 1. KUBE_CONFIG

Your Kubernetes configuration file for cluster access.

```bash
# Get your kubeconfig (usually from ~/.kube/config)
cat ~/.kube/config | base64
```

- **Name**: `KUBE_CONFIG`
- **Value**: Base64-encoded content of your kubeconfig file

#### 2. HELM_VALUES_YAML

Complete Helm values configuration for your deployment.

1. Copy the template file:
   ```bash
   cp helm/qelos/values.yaml.github.tpl helm/qelos/values.yaml
   ```

2. Edit `helm/qelos/values.yaml` and replace all placeholders:
   - `{{ .Values.ENVIRONMENT }}` → `production` or `staging`
   - `{{ .Values.INTERNAL_SECRET }}` → Generate a strong random secret
   - `{{ .Values.GITHUB_USERNAME }}` → Your GitHub username
   - `{{ .Values.JWT_SECRET }}` → Generate a strong random secret
   - `{{ .Values.REFRESH_TOKEN_SECRET }}` → Generate a strong random secret
   - `{{ .Values.SECRETS_TOKEN }}` → Generate a strong random secret
   - `{{ .Values.SECRETS_SERVICE_SECRET }}` → Generate a strong random secret
   - `{{ .Values.NO_CODE_SERVICE_SECRET }}` → Generate a strong random secret
   - `{{ .Values.PLUGINS_SERVICE_SECRET }}` → Generate a strong random secret
   - `{{ .Values.ASSETS_SERVICE_SECRET }}` → Generate a strong random secret
   - `{{ .Values.DRAFTS_SERVICE_SECRET }}` → Generate a strong random secret
   - `{{ .Values.AI_SERVICE_SECRET }}` → Generate a strong random secret
   - `${MONGODB_HOST}` → Your MongoDB host
   - `${MONGODB_PORT}` → Your MongoDB port (default: 27017)
   - `${MONGODB_DATABASE}` → Your MongoDB database name
   - `{{ .Values.MONGODB_VOLUME_PATH }}` → Path for MongoDB volume

3. Generate secrets using:
   ```bash
   # Generate random secrets
   openssl rand -base64 32
   ```

4. Add the complete file content as a secret:
   - **Name**: `HELM_VALUES_YAML`
   - **Value**: Entire contents of your configured `values.yaml` file

#### 3. Optional: Environment-Specific Secrets

For multiple environments (staging, production), you can create additional secrets:
- `HELM_VALUES_YAML_STAGING`
- `HELM_VALUES_YAML_PRODUCTION`

## Step 5: Configure GitHub Actions Workflows

The repository includes three main workflows:

### 1. CI/CD Pipeline (`main.yml`)
- Triggers on push to `main` or `develop` branches
- Builds the monorepo and creates artifacts

### 2. Docker Release (`docker-release.yml`)
- Builds and pushes Docker images to GHCR
- Tags images with branch name and commit SHA
- Runs after successful CI/CD pipeline

### 3. Helm Deployment (`deploy.yml`)
- Deploys to Kubernetes using Helm
- Can be triggered manually or automatically
- Uses the secrets configured above

### Customize Workflows (Optional)

Edit workflow files in `.github/workflows/` to match your needs:

```yaml
# Example: Change deployment trigger
on:
  workflow_dispatch:  # Manual trigger only
  # or
  push:
    branches:
      - main  # Auto-deploy on push to main
```

## Step 6: Update Image Registry Paths

Ensure your Helm values file uses your GitHub username:

```yaml
gateway:
  image:
    repository: ghcr.io/YOUR-USERNAME/qelos/gateway
    tag: latest

auth:
  image:
    repository: ghcr.io/YOUR-USERNAME/qelos/auth
    tag: latest

# ... repeat for all services
```

## Step 7: Initial Deployment

### Trigger the Workflows

1. Push a commit to the `main` branch:
   ```bash
   git add .
   git commit -m "Configure for my deployment"
   git push origin main
   ```

2. This will trigger:
   - CI/CD pipeline (builds artifacts)
   - Docker release (builds and pushes images)

3. Manually trigger deployment:
   - Go to **Actions** tab in your repository
   - Select **Deploy with Helm** workflow
   - Click **Run workflow**
   - Select the branch and environment
   - Click **Run workflow**

### Monitor Deployment

1. Check GitHub Actions logs for any errors
2. Verify pods are running in your cluster:
   ```bash
   kubectl get pods
   ```

3. Check service status:
   ```bash
   kubectl get svc
   ```

## Step 8: Keeping Your Fork Updated

Periodically sync your fork with the upstream repository:

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream main into your main
git checkout main
git merge upstream/main

# Push updates to your fork
git push origin main
```

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Use GitHub Environments** for additional protection:
   - Go to **Settings** > **Environments**
   - Create environments (e.g., `production`, `staging`)
   - Add protection rules (required reviewers, wait timer)
   - Assign environment-specific secrets

3. **Rotate secrets regularly**:
   - Update secrets in GitHub Actions
   - Redeploy services to apply new secrets

4. **Limit access**:
   - Use least-privilege principle for service accounts
   - Restrict who can trigger deployments
   - Enable branch protection rules

## Troubleshooting

### Images Not Found

If pods fail with "ImagePullBackOff":
1. Verify GHCR images are public or you have proper credentials
2. Check image names match your GitHub username
3. Ensure Docker images were successfully built and pushed

### Deployment Fails

If Helm deployment fails:
1. Check GitHub Actions logs for detailed error messages
2. Verify `KUBE_CONFIG` secret is correct
3. Ensure your Kubernetes cluster is accessible
4. Validate `HELM_VALUES_YAML` syntax

### Secret Issues

If services fail to start:
1. Verify all placeholders in `values.yaml` are replaced
2. Check service logs: `kubectl logs <pod-name>`
3. Ensure secrets are properly formatted (no extra spaces/newlines)

## Next Steps

- [Kubernetes Cluster Management](./kubernetes-cluster-management.md) - Learn how to manage your K8s cluster
- [Production Guide](./production-guide.md) - Production deployment best practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
