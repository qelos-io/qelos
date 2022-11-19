<template>
  <Layout v-if="payload.layout" :config="config" :kind="kind" :layout="payload.layout" :connected-data="payload.connectedData"/>
</template>

<script lang="ts">
import {loadAll} from '../services/sdk';
import Layout from '../components/Layout.vue';
import {usePage} from '../services/use-page';

export const route = '/search'
export const name = 'search'

export default {
  components: {Layout},
  setup() {
    return usePage(name)
  }
}

export const getPayload = (ctx) => loadAll(name, ctx);
</script>

