# Qelos Assets service

An HTTP server to manage static assets on several assets providers

## Dependencies
- Node.js
- npm OR yarn
- MongoDB

## Usage
### As a Docker container
```sh
$ docker run -p 3001:3001 qelos/assets
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

## Configuration

### File Size Limits
Uploads are limited to **50MB** by default. To change the limit, set the `MAX_FILE_SIZE` environment variable (in bytes):

```sh
MAX_FILE_SIZE=104857600 # 100MB
```

Files exceeding the limit are rejected with a `413` status code and the following response:

```json
{ "message": "File too large.", "maxFileSize": "<configured limit in bytes>" }
```
