import {createApp} from 'vue'
import router from './router'
import './style/main.scss'
import editor from './plugins/editor'
import elements from './plugins/element'
import {i18n} from './plugins/i18n'
import {createPinia} from 'pinia';
import JsonEditorVue from 'json-editor-vue'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(editor)
app.use(JsonEditorVue)

elements(app)
app.mount('#app')
