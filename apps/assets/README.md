# Qelos Assets service

An HTTP server to manage static assets on several assets providers

## Dependencies
- Node.js
- npm OR yarn
- MongoDB
- [Authentication-service](https://github.com/greenpress/authentication-service)
- [Secrets-service](https://github.com/greenpress/secrets-service)

## Usage
### As a Docker container
```sh
$ docker run -p 3001:3001 qelos/assets
```

## Development and Independent Usage
In case you would like to run this project manually, for any reason, there are several commands you need to acknowledge:

### Install
```sh
$ npm install
```

### Launch
```sh
$ npm start
```
