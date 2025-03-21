For the latest installation instructions, please refer to the official documentation:  
➡️ [**QELOS Installation and Setup Guide**](https://docs.qelos.io/getting-started/installation.html)

## Dependencies
#### Direct usage
- Node.js
- NPM
- Docker / MongoDB
- (Optional: Redis)

#### Dockerized usage
- Docker
- Docker Compose

## Getting started
#### Install
```sh
$ npm install
$ npm run build
```

#### Run production
```sh
$ npm start
```

#### Run development
```sh
# In case you have separated MongoDB instance on your local machine:
$ npm run dev

# In case you don't (will run MongoDB using Docker):
$ npm run dev --x=all
```

## Dockerized Usage

### Pre-running
Before running a docker-compose environment, you'll need an `.env` file and the `compose` library.

You can just copy the `.env.example` and call it `.env` (manually), but you can also do it on command line:
```sh
$ cd compose

# for linux or mac:
$ cp .env.example .env

# for all operation systems (including windows):
$ npm run create-env
```

Running Qelos via Docker-Compose is a very simple task.
You might need to pre-install Docker and Docker Compose, and then run these commands:
```sh
$ cd compose
$ docker-compose up
```

#### Scaling dockerized application
When using dockerized solution, you can choose to run each service separately, and scale each service according to your needs.
To run a composition that is more suitable to those cases, use the "scaled" yaml:
```sh
$ cd compose
$ docker-compose -f docker-compose.scaled.yml up
```
If you're using a small machine, such as shared hosting packages, or low cpu or memory cloud services, you should probably use the basic environment, such as the regular compose file, or directly using Node.js.

# Local Development Setup

## Prerequisites
- Docker Desktop
- kubectl
- Helm

## Setting up a Local Kubernetes Cluster
1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
2. Enable Kubernetes in Docker Desktop settings
3. Verify cluster is running:
```bash
kubectl cluster-info
```

## Deploying Qelos
1. Install Helm:
```bash
brew install helm
```
2. Deploy Qelos:
```bash
helm upgrade --install qelos ./helm/qelos
kubectl port-forward svc/gateway-service 3000:80
```
3. Access the admin interface at http://localhost:3000
