<template>
  <h1>
    <RemoveButton v-if="editableManager"
                  class="remove-component-btn"
                  @click="editableManager.removeComponent($el)" />
    <span>{{ $t(title) }}</span>
    <el-button text v-if="createRoutePath || createRoute || onCreate" @click="create">
      <el-icon size="28">
        <font-awesome-icon :icon="['far', 'square-plus']" />
      </el-icon>
    </el-button>
  </h1>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { inject } from 'vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

const router = useRouter()
const emit = defineEmits(['create', 'removeComponent'])

const props = defineProps({
  title: String,
  createRoute: String,
  createRoutePath: String,
  onCreate: Function
})

function create() {
  if (props.onCreate) {
    emit('create')
  } else {
    router.push(props.createRoutePath || { name: props.createRoute })
  }
}


const editableManager = inject('editableManager');
</script>

<style scoped lang="scss">
h1 {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: var(--body-bg);
  display: flex;
  justify-content: center;
  align-items: center;
  span {
    margin-inline-end: auto;
  }

  > * {
    vertical-align: middle;
  }
}
</style>
