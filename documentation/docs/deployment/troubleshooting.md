# Troubleshooting

## Common Issues

### Pod Startup Issues

Check pod status and logs:
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

Common causes:
- Image pull errors
- Resource constraints
- Configuration errors
- Volume mount issues

### Service Discovery Issues

Verify service configuration:
```bash
kubectl get svc
kubectl describe svc <service-name>
```

Common causes:
- Incorrect service names
- Port misconfigurations
- Network policy restrictions

### Configuration Issues

1. Check Values
- Verify values in `values-env.yaml`
- Validate environment variables
- Check service connectivity

2. MongoDB Connection
```bash
# Check MongoDB pod status
kubectl get pods -l app=mongodb

# Verify MongoDB service
kubectl describe svc mongodb-service
```

3. Redis Connection
```bash
# Check Redis pod status
kubectl get pods -l app=redis

# Verify Redis service
kubectl describe svc redis-service
```

## Debug Commands

### Check Resources
```bash
# View resource usage
kubectl top pods
kubectl top nodes

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

### Network Debug
```bash
# Test service connectivity
kubectl run -i --tty --rm debug --image=busybox --restart=Never -- wget -O- http://service-name:port

# DNS resolution
kubectl run -i --tty --rm debug --image=busybox --restart=Never -- nslookup service-name
```

### Log Analysis
```bash
# Get logs with timestamps
kubectl logs -f --timestamps deployment/gateway-deployment

# Get previous container logs
kubectl logs --previous pod-name
```
