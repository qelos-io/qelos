<template>
  <h1>{{ $route.meta.crud.display.capitalizedPlural }}</h1>
  data: {{list}}
  <textarea style="height: 80vh">{{$route.meta}}</textarea>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {getCrud} from '@/services/crud';

const route = useRoute();

const api = computed(() => getCrud(route.meta.crudBasePath as string || ''))
const list = ref();

watch(api, () => {
  api.value.getAll().then(data => list.value = data)
}, {immediate: true})
</script>

<style scoped>

</style>