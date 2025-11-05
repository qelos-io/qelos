# Kubernetes Cluster Management for Qelos

This guide covers managing a Kubernetes cluster for Qelos deployment, including setup, monitoring, scaling, and maintenance.

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl CLI installed
- Helm 3.x installed
- Basic understanding of Kubernetes concepts

## Cluster Setup Options

### Option 1: Managed Kubernetes Services

#### Google Kubernetes Engine (GKE)

```bash
# Create a GKE cluster
gcloud container clusters create qelos-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 5

# Get credentials
gcloud container clusters get-credentials qelos-cluster --zone us-central1-a
```

#### Amazon EKS

```bash
# Create an EKS cluster (using eksctl)
eksctl create cluster \
  --name qelos-cluster \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --name qelos-cluster --region us-west-2
```

#### Azure Kubernetes Service (AKS)

```bash
# Create resource group
az group create --name qelos-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group qelos-rg \
  --name qelos-cluster \
  --node-count 3 \
  --node-vm-size Standard_DS2_v2 \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 5 \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group qelos-rg --name qelos-cluster
```

#### DigitalOcean Kubernetes (DOKS)

```bash
# Create a DOKS cluster
doctl kubernetes cluster create qelos-cluster \
  --region nyc1 \
  --version 1.28.2-do.0 \
  --node-pool "name=worker-pool;size=s-2vcpu-4gb;count=3;auto-scale=true;min-nodes=2;max-nodes=5"

# Get credentials
doctl kubernetes cluster kubeconfig save qelos-cluster
```

### Option 2: Self-Managed Kubernetes

#### Using kubeadm (On-Premise/VMs)

```bash
# On master node
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# Set up kubectl for your user
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install a pod network (Calico example)
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# On worker nodes, join the cluster (use the command from kubeadm init output)
sudo kubeadm join <master-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

#### Using k3s (Lightweight)

```bash
# On master node
curl -sfL https://get.k3s.io | sh -

# Get kubeconfig
sudo cat /var/lib/rancher/k3s/server/node-token

# On worker nodes
curl -sfL https://get.k3s.io | K3S_URL=https://<master-ip>:6443 K3S_TOKEN=<token> sh -
```

## Cluster Configuration for Qelos

### 1. Create Namespace

```bash
# Create a dedicated namespace for Qelos
kubectl create namespace qelos

# Set as default namespace (optional)
kubectl config set-context --current --namespace=qelos
```

### 2. Configure Storage Classes

Qelos requires persistent storage for MongoDB and Redis.

```bash
# Check available storage classes
kubectl get storageclass

# Example: Create a storage class (adjust based on your provider)
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: qelos-storage
provisioner: kubernetes.io/gce-pd  # Change based on provider
parameters:
  type: pd-standard
  replication-type: regional-pd
allowVolumeExpansion: true
EOF
```

### 3. Set Up Ingress Controller

Install an ingress controller to expose services:

#### NGINX Ingress Controller

```bash
# Install using Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

#### Traefik (Alternative)

```bash
helm repo add traefik https://helm.traefik.io/traefik
helm repo update

helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace
```

### 4. Configure TLS/SSL Certificates

#### Using cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create a ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 5. Set Up Monitoring

#### Prometheus and Grafana

```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Default credentials: admin / prom-operator
```

### 6. Configure Resource Quotas

```bash
# Create resource quota for Qelos namespace
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: qelos-quota
  namespace: qelos
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: "10"
EOF
```

## Deploying Qelos with Helm

### 1. Prepare Helm Values

Create your `values.yaml` file (see [GitHub Fork Setup](./github-fork-setup.md) for details):

```bash
cp helm/qelos/values.yaml.github.tpl helm/qelos/values-production.yaml
# Edit values-production.yaml with your configuration
```

### 2. Install Qelos

```bash
# Install Qelos in the qelos namespace
helm install qelos ./helm/qelos \
  -f ./helm/qelos/values-production.yaml \
  --namespace qelos \
  --create-namespace

# Or upgrade if already installed
helm upgrade --install qelos ./helm/qelos \
  -f ./helm/qelos/values-production.yaml \
  --namespace qelos
```

### 3. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n qelos

# Check services
kubectl get svc -n qelos

# Check deployments
kubectl get deployments -n qelos

# View logs for a specific service
kubectl logs -f deployment/gateway-deployment -n qelos
```

## Cluster Management Tasks

### Scaling Services

#### Manual Scaling

```bash
# Scale a specific service
kubectl scale deployment gateway-deployment --replicas=5 -n qelos

# Scale using Helm
helm upgrade qelos ./helm/qelos \
  -f ./helm/qelos/values-production.yaml \
  --set gateway.replicas=5 \
  --namespace qelos
```

#### Horizontal Pod Autoscaling (HPA)

```bash
# Create HPA for gateway service
kubectl autoscale deployment gateway-deployment \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n qelos

# View HPA status
kubectl get hpa -n qelos

# Describe HPA
kubectl describe hpa gateway-deployment -n qelos
```

### Updating Services

#### Rolling Updates

```bash
# Update image for a service
kubectl set image deployment/gateway-deployment \
  gateway=ghcr.io/your-username/qelos/gateway:v2.0.0 \
  -n qelos

# Check rollout status
kubectl rollout status deployment/gateway-deployment -n qelos

# View rollout history
kubectl rollout history deployment/gateway-deployment -n qelos
```

#### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/gateway-deployment -n qelos

# Rollback to specific revision
kubectl rollout undo deployment/gateway-deployment --to-revision=2 -n qelos
```

### Managing Secrets

```bash
# Create a secret
kubectl create secret generic qelos-secrets \
  --from-literal=jwt-secret=your-secret \
  --from-literal=db-password=your-password \
  -n qelos

# Update a secret
kubectl delete secret qelos-secrets -n qelos
kubectl create secret generic qelos-secrets \
  --from-literal=jwt-secret=new-secret \
  --from-literal=db-password=new-password \
  -n qelos

# View secrets (base64 encoded)
kubectl get secret qelos-secrets -o yaml -n qelos

# Decode a secret
kubectl get secret qelos-secrets -o jsonpath='{.data.jwt-secret}' -n qelos | base64 --decode
```

### Managing ConfigMaps

```bash
# Create a ConfigMap
kubectl create configmap qelos-config \
  --from-literal=environment=production \
  --from-literal=log-level=info \
  -n qelos

# Update a ConfigMap
kubectl edit configmap qelos-config -n qelos

# View ConfigMap
kubectl get configmap qelos-config -o yaml -n qelos
```

### Backup and Restore

#### Backup MongoDB Data

```bash
# Port forward to MongoDB
kubectl port-forward svc/mongodb-service 27017:27017 -n qelos

# In another terminal, backup using mongodump
mongodump --host localhost --port 27017 --out ./backup-$(date +%Y%m%d)

# Or exec into MongoDB pod
kubectl exec -it mongodb-deployment-xxx -n qelos -- mongodump --out /tmp/backup
kubectl cp qelos/mongodb-deployment-xxx:/tmp/backup ./backup-$(date +%Y%m%d)
```

#### Restore MongoDB Data

```bash
# Restore using mongorestore
mongorestore --host localhost --port 27017 ./backup-20240101

# Or exec into MongoDB pod
kubectl cp ./backup-20240101 qelos/mongodb-deployment-xxx:/tmp/backup
kubectl exec -it mongodb-deployment-xxx -n qelos -- mongorestore /tmp/backup
```

#### Backup Persistent Volumes

```bash
# Create a snapshot (cloud provider specific)
# GKE example:
gcloud compute disks snapshot DISK_NAME --snapshot-names=qelos-backup-$(date +%Y%m%d)

# AWS example:
aws ec2 create-snapshot --volume-id vol-xxxxx --description "Qelos backup $(date +%Y%m%d)"
```

## Monitoring and Logging

### View Logs

```bash
# View logs for a pod
kubectl logs pod-name -n qelos

# Follow logs
kubectl logs -f pod-name -n qelos

# View logs for all pods in a deployment
kubectl logs -f deployment/gateway-deployment -n qelos

# View logs for a specific container in a pod
kubectl logs pod-name -c container-name -n qelos

# View previous container logs (if crashed)
kubectl logs pod-name --previous -n qelos
```

### Resource Usage

```bash
# View resource usage for nodes
kubectl top nodes

# View resource usage for pods
kubectl top pods -n qelos

# View detailed resource usage
kubectl describe node node-name
```

### Events

```bash
# View cluster events
kubectl get events -n qelos --sort-by='.lastTimestamp'

# Watch events in real-time
kubectl get events -n qelos --watch
```

## Troubleshooting

### Pod Issues

```bash
# Describe a pod to see events and status
kubectl describe pod pod-name -n qelos

# Check pod status
kubectl get pods -n qelos -o wide

# Get pod YAML
kubectl get pod pod-name -n qelos -o yaml

# Execute commands in a pod
kubectl exec -it pod-name -n qelos -- /bin/sh

# Check pod resource usage
kubectl top pod pod-name -n qelos
```

### Service Issues

```bash
# Check service endpoints
kubectl get endpoints -n qelos

# Describe a service
kubectl describe svc service-name -n qelos

# Test service connectivity from within cluster
kubectl run test-pod --image=busybox -it --rm -n qelos -- wget -O- http://service-name:port
```

### Network Issues

```bash
# Check network policies
kubectl get networkpolicies -n qelos

# Test DNS resolution
kubectl run test-pod --image=busybox -it --rm -n qelos -- nslookup service-name

# Check ingress
kubectl get ingress -n qelos
kubectl describe ingress ingress-name -n qelos
```

### Storage Issues

```bash
# Check persistent volumes
kubectl get pv

# Check persistent volume claims
kubectl get pvc -n qelos

# Describe a PVC
kubectl describe pvc pvc-name -n qelos
```

## Cluster Maintenance

### Node Maintenance

```bash
# Drain a node (before maintenance)
kubectl drain node-name --ignore-daemonsets --delete-emptydir-data

# Mark node as unschedulable
kubectl cordon node-name

# Mark node as schedulable
kubectl uncordon node-name
```

### Cluster Upgrades

```bash
# Check current version
kubectl version

# Upgrade cluster (managed services)
# GKE:
gcloud container clusters upgrade qelos-cluster --master --cluster-version 1.28

# EKS:
eksctl upgrade cluster --name qelos-cluster --version 1.28

# AKS:
az aks upgrade --resource-group qelos-rg --name qelos-cluster --kubernetes-version 1.28.0
```

### Cleanup

```bash
# Delete failed pods
kubectl delete pod --field-selector=status.phase=Failed -n qelos

# Delete completed jobs
kubectl delete job --field-selector=status.successful=1 -n qelos

# Clean up unused images (on nodes)
kubectl get nodes -o name | xargs -I {} kubectl debug {} -it --image=alpine -- crictl rmi --prune
```

## Security Best Practices

### Network Policies

```bash
# Example: Restrict traffic to MongoDB
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mongodb-policy
  namespace: qelos
spec:
  podSelector:
    matchLabels:
      app: mongodb
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          access-mongodb: "true"
    ports:
    - protocol: TCP
      port: 27017
EOF
```

### RBAC Configuration

```bash
# Create a service account
kubectl create serviceaccount qelos-sa -n qelos

# Create a role
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: qelos-role
  namespace: qelos
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
EOF

# Bind role to service account
kubectl create rolebinding qelos-binding \
  --role=qelos-role \
  --serviceaccount=qelos:qelos-sa \
  -n qelos
```

### Pod Security Standards

```bash
# Label namespace with pod security standard
kubectl label namespace qelos \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## Cost Optimization

### Resource Right-Sizing

```bash
# Analyze resource usage
kubectl top pods -n qelos --containers

# Use Vertical Pod Autoscaler (VPA) for recommendations
kubectl describe vpa vpa-name -n qelos
```

### Node Auto-Scaling

```bash
# Enable cluster autoscaler (cloud provider specific)
# GKE:
gcloud container clusters update qelos-cluster \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10 \
  --zone us-central1-a
```

### Spot/Preemptible Instances

```bash
# Create node pool with spot instances (GKE example)
gcloud container node-pools create spot-pool \
  --cluster qelos-cluster \
  --preemptible \
  --num-nodes 2 \
  --zone us-central1-a
```

## Next Steps

- [Production Guide](./production-guide.md) - Production deployment best practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Configuration](./configuration.md) - Advanced configuration options
