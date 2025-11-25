<script setup lang="ts">
import AiChat from '@/modules/pre-designed/components/AiChat.vue';
</script>

<template>
<AiChat class="mock-chat" url="" :suggestions="[{label: 'Option 1', icon: 'fa-microphone', text: 'Description 1'}, {label: 'Option 2', icon: 'fa-user', text: 'Description 2'}]" :full-screen="false" :title="'Demo AI Chat'"/>
</template>

<style scoped>
.mock-chat {
    max-height: 50px;
}
</style>