<template>
  <div v-if="layout && blocks">
    <LayoutForm :layout="layout" :submitting="submitting" @submitted="updateLayout" />
  </div>
</template>

<script lang="ts" setup>
import {useRoute} from 'vue-router'
import {useEditLayout} from './compositions/layouts'
import LayoutForm from './components/LayoutForm.vue';
import {LayoutKind} from '@qelos/sdk/dist/administrator/layouts';
import {toRef} from 'vue';
import {useBlocksList} from '@/modules/blocks/store/blocks-list';

const kind = useRoute().params.kind as LayoutKind;
const blocks = toRef(useBlocksList(), 'blocks');
const {layout, submitting, updateLayout} = useEditLayout(kind);
</script>
<style scoped>
textarea {
  width: 100%;
  min-height: 500px;
  border: 1px solid #eee;
  border-radius: var(--border-radius);
  padding: 10px;
}
</style>
