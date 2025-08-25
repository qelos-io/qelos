# GitHub Actions Setup Guide

This document provides instructions for setting up the GitHub Actions workflows for the Qelos project.

## Required Secrets

You need to set up the following secrets in your GitHub repository:

1. **KUBE_CONFIG**: Your Kubernetes configuration file content for connecting to your cluster.
2. **HELM_VALUES_YAML**: The complete values.yaml file content for your Helm chart.

## Setting Up Secrets

1. Go to your GitHub repository
2. Click on "Settings"
3. In the left sidebar, click on "Secrets and variables" > "Actions"
4. Click on "New repository secret"
5. Add the required secrets:
   - Name: `KUBE_CONFIG`
   - Value: [Your base64-encoded kubeconfig file content]
6. Click "Add secret"
7. Repeat for the Helm values:
   - Name: `HELM_VALUES_YAML`
   - Value: [Your complete values.yaml file content]
8. Click "Add secret"

## Workflow Overview

The CI/CD pipeline consists of three main workflows:

1. **Qelos CI/CD** (`main.yml`): Builds the monorepo and creates artifacts
2. **Docker Release** (`docker-release.yml`): Builds and pushes Docker images for each service
3. **Deploy with Helm** (`deploy.yml`): Deploys the application to Kubernetes using Helm

## Helm Deployment

The deployment workflow uses Helm to deploy the application to Kubernetes. The workflow:

1. Checks if required secrets exist before proceeding
2. Sets up Helm and kubectl
3. Creates a kubeconfig file from the `KUBE_CONFIG` secret
4. Creates a values.yaml file from the `HELM_VALUES_YAML` secret
5. Runs `helm upgrade --install` to deploy the application

A template for the values.yaml file is available at `helm/qelos/values.yaml.github.tpl`. This template uses GitHub Container Registry image paths and includes placeholders for secrets.

## Security Measures

The deployment workflow includes several security measures to protect sensitive information:

1. **Secret Existence Check**: The workflow verifies that required secrets exist before proceeding
2. **Command Output Protection**: All steps that handle sensitive data use `set +x` to disable command echoing
3. **Strict File Permissions**: Files containing secrets use `umask 077` and `chmod 600` to restrict access
4. **Debug Mode Disabled**: Helm debug output is disabled to prevent sensitive data in logs
5. **Environment Protection**: The workflow uses GitHub Environments to enable additional protection rules
6. **Manual Trigger Control**: Manual deployments require explicit environment selection

These measures help ensure that sensitive information is not exposed in build logs or to unauthorized users.

## Container Registry

The workflows are configured to use GitHub Container Registry (ghcr.io). Docker images will be pushed to:

```
ghcr.io/[your-username]/qelos/[service-name]
```

## Branch Strategy

- The `main` branch will be tagged with `latest`, `main`, and the commit SHA
- Other branches will be tagged with the branch name and commit SHA

## Permissions

Make sure your repository has the necessary permissions to:
1. Write to the GitHub Container Registry
2. Create and use GitHub Actions artifacts

This is typically handled automatically with the `GITHUB_TOKEN` that's provided by GitHub Actions.
