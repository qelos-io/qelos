---
title: Create your first plugin
editLink: true
---

# {{ $frontmatter.title }}

### Run:
```shell
npm init play@latest my-new-plugin
```

### Go to your new plugin:
```shell
cd my-new-plugin
npm install
```

### Backend dev server:
```shell
npm run dev
```

### Frontend dev server:
```shell
cd app-ui
npm install # one time
npm run dev
```


### Build your frontend:
```shell
cd app-ui
npm run build
```
Notice that the build out dir is at the root-level `public` folder.

### Run your plugin in production:
```shell
npm start
```