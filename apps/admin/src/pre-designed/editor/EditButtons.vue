<script setup lang="ts">
import AddMore from '@/modules/core/components/forms/AddMore.vue';

defineEmits(['code', 'wizard'])
</script>

<template>
  <div class="flex-row" centered>
    <el-button-group>
      <el-button size="large" @click="$emit('wizard')">
        <el-icon>
          <font-awesome-icon :icon="['fas', 'layer-group']" />
        </el-icon>
        <span>{{ $t('Wizard') }}</span>
      </el-button>
      <el-button size="large" @click="$emit('code')">
        <el-icon>
          <font-awesome-icon :icon="['fas', 'code']" />
        </el-icon>
        <span>{{ $t('Code') }}</span>
      </el-button>
    </el-button-group>
  </div>
</template>