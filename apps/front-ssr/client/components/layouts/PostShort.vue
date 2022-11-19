<template>
  <section class="post-short" :key="`post-short-${post._id}`" v-html="post.short"/>
</template>
<script lang="ts" setup>
import {IPost} from '@qelos/sdk/dist/posts';

defineProps({
  post: Object as () => IPost,
})
</script>
