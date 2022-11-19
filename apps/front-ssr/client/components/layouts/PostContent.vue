<template>
  <section class="post-content"
           v-for="(content, index) in post.contents"
           :key="`post-content-${post._id}-${index}`"
           v-html="content"/>
</template>
<script lang="ts" setup>
import {IPost} from '@qelos/sdk/dist/posts';

defineProps({
  post: Object as () => IPost,
})
</script>
