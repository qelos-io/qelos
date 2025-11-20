---
trigger: always_on
---

qelos is a saas platform to create saas applications
it is multi-tenant
the tech stack is: node.js, express, mongodb, redis, mongoose.
the frontend tech stack is: vue 3.5 with composition api, pinia, element-plus, vue-i18n, vue-router, vue-echarts, monaco-editor, primevue
when writing css and styles: always prefer using inset positons like inline and block instead of top, left, bottom and right.
when an input have to be ltr, like a code line, a script line, etc - ude the dir="ltr" attribute - we already defined it in css to assure it will work.

the /apps/gateway is the source to all requests.
/packages/api-kit is the api kit for all backend services. it uses express.js, node, axios, morgan for logs.
in vue.js components, prefer composition api, prefer to use defineModel() when possible instead of defineProps() + defineEmits() for "update:modelValue".

/apps/db is a mongodb configuration for dev environment
/apps/auth is the authentication service (users, workspaces)
/apps/content is the content service (drafts, configurations)
/apps/secrets is the secrets service (secrets)
/apps/no-code is the no-code service (no-code, creating blueprints)
/apps/ai is the ai service. it handles chat completion and ai integration with any ai provider.
/apps/admin is the frontend admin service
/apps/plugins is the plugins service to allow other micro-saas platforms to connect to qelos, and to create interations between them.

effeciency is the most important aspect of the code.

prefer typescript when possible.
prefer using esmodules instead of commonjs.

a folder named "utils" is not a good practice, consider to have better patterns, such as services, models, store, compositions, etc.