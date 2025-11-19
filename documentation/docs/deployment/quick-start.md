# Quick Start: Deploy Qelos to Kubernetes

This quick start guide will get you from zero to a running Qelos deployment on Kubernetes in the shortest time possible.

## Prerequisites Checklist

- [ ] GitHub account
- [ ] Kubernetes cluster (any provider)
- [ ] `kubectl` installed and configured
- [ ] `helm` 3.x installed
- [ ] Docker installed (for local testing)

## Step 1: Fork and Clone (5 minutes)

1. Fork the repository on GitHub: `https://github.com/qelos-io/qelos`
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/qelos.git
   cd qelos
   ```

## Step 2: Set Up GitHub Secrets (10 minutes)

### Get Your Kubeconfig

```bash
# Get your kubeconfig and encode it
cat ~/.kube/config | base64
```

### Create Helm Values

```bash
# Copy the template
cp helm/qelos/values.yaml.github.tpl helm/qelos/values.yaml

# Generate secrets
openssl rand -base64 32  # Run this for each secret needed
```

Edit `helm/qelos/values.yaml` and replace:

<div v-pre>

- All `{{ .Values.* }}` placeholders with actual values
- All `${MONGODB_*}` with your MongoDB connection details
- Your GitHub username in image paths

</div>

### Add Secrets to GitHub

Go to **Settings** > **Secrets and variables** > **Actions** and add:

1. **KUBE_CONFIG**: Your base64-encoded kubeconfig
2. **HELM_VALUES_YAML**: Complete contents of your edited `values.yaml`

## Step 3: Enable GitHub Container Registry (5 minutes)

1. Go to **Settings** > **Developer settings** > **Personal access tokens**
2. Create a token with `write:packages` scope
3. Login to GHCR:
   ```bash
   echo YOUR_TOKEN | docker login ghcr.io -u YOUR-USERNAME --password-stdin
   ```

## Step 4: Deploy (10 minutes)

### Trigger the Build

```bash
# Commit and push to trigger workflows
git add .
git commit -m "Initial deployment setup"
git push origin main
```

This triggers:
1. CI/CD pipeline (builds artifacts)
2. Docker release (builds and pushes images)

### Deploy to Kubernetes

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy with Helm** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

### Verify Deployment

```bash
# Check pods
kubectl get pods -n qelos

# Check services
kubectl get svc -n qelos

# View logs
kubectl logs -f deployment/gateway-deployment -n qelos
```

## Step 5: Access Your Application (5 minutes)

### Port Forward (Quick Access)

```bash
# Forward gateway service to localhost
kubectl port-forward svc/gateway-service 3000:80 -n qelos
```

Visit: `http://localhost:3000`

### Set Up Ingress (Production)

```bash
# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Create an ingress resource
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: qelos-ingress
  namespace: qelos
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway-service
            port:
              number: 80
EOF
```

## Common Issues

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod POD-NAME -n qelos

# Check logs
kubectl logs POD-NAME -n qelos
```

**Common causes:**
- Image pull errors (check GHCR permissions)
- Configuration errors (verify secrets)
- Resource constraints (check node resources)

### Services Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n qelos

# Test internal connectivity
kubectl run test --image=busybox -it --rm -n qelos -- wget -O- http://gateway-service:80
```

### MongoDB Connection Issues

```bash
# Check MongoDB pod
kubectl get pods -l app=mongodb -n qelos

# Check MongoDB logs
kubectl logs deployment/mongodb-deployment -n qelos
```

## Next Steps

Now that you have Qelos running:

1. **Configure your domain**: Set up DNS and SSL certificates
2. **Set up monitoring**: Install Prometheus and Grafana
3. **Configure backups**: Set up automated MongoDB backups
4. **Scale services**: Adjust replica counts based on load
5. **Review security**: Implement network policies and RBAC

## Detailed Guides

- [GitHub Fork Setup](./github-fork-setup.md) - Complete forking and CI/CD guide
- [Kubernetes Cluster Management](./kubernetes-cluster-management.md) - Comprehensive cluster management
- [Production Guide](./production-guide.md) - Production best practices
- [Troubleshooting](./troubleshooting.md) - Detailed troubleshooting guide

## Getting Help

- **Documentation**: Check the detailed guides above
- **Discord**: Join our community at `https://discord.gg/8D6TMdzZYJ`
- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions and share experiences

## Estimated Total Time

- **Minimum**: ~35 minutes (if everything goes smoothly)
- **Typical**: 1-2 hours (including troubleshooting)
- **First time**: 2-4 hours (learning and setup)

## Success Checklist

- [ ] Repository forked and cloned
- [ ] GitHub secrets configured
- [ ] GHCR access enabled
- [ ] CI/CD workflows completed successfully
- [ ] All pods running in Kubernetes
- [ ] Services accessible
- [ ] Application responding to requests
- [ ] Monitoring set up (optional but recommended)
