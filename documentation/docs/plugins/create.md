---
title: Create a Plugin
editLink: true
---
# Create a Plugin


### Run:
```shell
npm init play@latest my-new-plugin
```

### Go to your new plugin:
```shell
cd my-new-plugin
npm install
```

The root folder is the backend application.
`@qelos/plugin-play` used **fastify** out of the box.

The frontend app is located under `/web-ui` folder, and it's a basic **Vite** project with some basic custom configurations in order to mimic production behavior on local dev environment.

That's it.