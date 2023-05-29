import {createApp} from 'vue'
import router from './router'
import './style/main.scss'
import editor from './plugins/editor'
import elements from './plugins/element'
import {i18n} from './plugins/i18n'
import {createPinia} from 'pinia';
import JsonEditorVue from 'json-editor-vue'
import App from './App.vue'
import TemplatedRemoveButton from '@/modules/pre-designed/components/TemplatedRemoveButton.vue';
import TemplatedEditButton from '@/modules/pre-designed/components/TemplatedEditButton.vue';

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(editor)
app.use(JsonEditorVue)

app.component('TemplatedRemoveButton', TemplatedRemoveButton)
app.component('TemplatedEditButton', TemplatedEditButton)

elements(app)
app.mount('#app')
