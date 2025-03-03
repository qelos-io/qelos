<template>
  <el-form @submit.native.prevent="save" class="ssr-scripts-form">
    <p>Feel free to use the following variables:<br>
      <el-tag class="tag" v-for="key in keys" :key="key" v-html="getKeyTemplate(key)" @click="copyToClipboard(key)"/>
    </p>
    <el-form-item label="Enter head">
      <Monaco v-model="edited.head"
              language="html"/>
    </el-form-item>
    <el-form-item label="Enter body">
      <Monaco v-model="edited.body"
              language="html"/>
    </el-form-item>

    <div class="submit-wrapper">
      <SaveButton :submitting="submitting"/>
    </div>
  </el-form>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import Monaco from '../../users/components/Monaco.vue'
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { clearNulls } from '../../core/utils/clear-nulls';

const { t } = useI18n()


const keys = [ 'name', 'logoUrl', 'description', 'keywords', 'slogan', 'language', 'direction', 'themeStylesUrl', 'scriptUrl', 'homeScreen', 'borderRadius', 'baseFontSize' ]

const props = defineProps({
  kind: String,
  metadata: Object as () => ({ head: string, body: string }),
  submitting: Boolean
})

function getKeyTemplate(key: string) {
  return `{{${key}}}`
}


function copyToClipboard(key: string) {
  navigator.clipboard.writeText(getKeyTemplate(key));
  ElMessage.info({
    message: t('Copied to clipboard'),
    type: 'info',
    center: true,
    customClass: 'copy-to-clipboard-message'
  })
}

const defaultMetadata = {
  head: `<link rel="icon" href="/favicon.ico" /><title>{{name}} - {{slogan}}</title>
<meta property="og:title" content="{{name}} - {{slogan}}">
<meta property="og:description" content="{{description}}">
<meta property="og:image" content="{{logoUrl}}">
<meta property="og:type" content="webapp">
<meta property="og:site_name" content="{{name}}">
<meta property="og:locale" content="{{language}}">`,
  body: ''
}
const edited = ref({
  head: props.metadata?.head || defaultMetadata.head,
  body: props.metadata?.body || defaultMetadata.body
})
const emit = defineEmits(['save']);


function save() {
  emit('save', clearNulls(edited.value))
}
</script>
<style scoped>
.tag {
  margin-inline: 5px;
  cursor: pointer;
}
.submit-wrapper {
  z-index: 5;
  background-color: var(--body-bg);
  margin: 0;
  padding: 20px;
  position: sticky;
  bottom: 0;
}
</style>

