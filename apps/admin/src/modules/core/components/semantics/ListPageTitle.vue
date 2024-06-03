<template>
  <h1>
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

const router = useRouter()
const emit = defineEmits(['create'])

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
