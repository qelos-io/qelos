# Qelos Authentication service

An HTTP server (back end only) with DB support & auth features 

## Usage
### As a Docker container
```
$ docker run -p 3001:3001 qelos/auth
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

## Main Features
- es6
- express
- mongoose
- passport
- validator
- signin / signup
- token and refresh-tokens
- optional roles by environment variables
- email verification

## Dependencies
- Node.js
- npm OR yarn
- MongoDB


## Future development
- email verification (next phase, support of multiple email services APIs)
- reset password
