# Qelos Content service

A content service for qelos platform 

## Main Features
- manage categories
- manage posts
- manage comments
- manage website configurations
- multi tenancy
- search posts
- post tags 
- auto-migrations for updates

## Dependencies
- Node.js
- pnpm
- MongoDB
- [Authentication-service](https://github.com/qelos-io/qelos)


## Usage
### As a Docker container
```sh
$ docker run -p 3001:3001 qelos/content
```

## Development and Independent Usage
In case you would like to run this project manually, for any reason, there are several commands you need to acknowledge:

### Install
```sh
$ pnpm install
```

### Launch
```sh
$ pnpm start
```
