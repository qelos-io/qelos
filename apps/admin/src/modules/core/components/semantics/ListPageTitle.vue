<template>
  <h1>
    <RemoveButton v-if="editableManager" class="remove-component-btn" @click="editableManager.removeComponent($el)" />
    <span>{{ $t(title) }}</span>
    <el-button type="primary" v-if="createRoute || onCreate" @click="create">
      <el-icon>
        <icon-edit/>
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
  onCreate: Function
})

function create() {
  if (props.onCreate) {
    emit('create')
  } else {
    router.push({ name: props.createRoute })
  }
}


const editableManager = inject('editableManager');
</script>

<style scoped lang="scss">
h1 {
  span {
    margin-inline-end: 20px;
  }

  > * {
    vertical-align: middle;
  }
}
</style>
