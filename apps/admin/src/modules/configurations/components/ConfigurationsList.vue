<template>
  <div>
    <GpItem v-for="config in list" :key="config.key">
      <template v-slot:title>
        <router-link :to="{name: 'editConfiguration', params: {key: config.key}}">{{ $t(config.key) }}
        </router-link>
      </template>
      <p v-if="config.description">{{ config.description }}</p>
      <small v-if="config.public">
        <el-icon>
          <icon-check/>
        </el-icon>
        Public</small>
      <template v-slot:actions v-if="config.key !== 'app-configuration'">
        <a @click.prevent="remove(config)">
          <el-icon>
            <icon-delete/>
          </el-icon>
          {{ $t('Remove') }}
        </a>
      </template>
    </GpItem>
  </div>
</template>
<script lang="ts" setup>
import {useConfigurationsList} from '../compositions/configurations'
import GpItem from '../../core/components/layout/GpItem.vue';
import configurationsService from '@/services/configurations-service';
import {useConfirmAction} from '@/modules/core/compositions/confirm-action';

const {list} = useConfigurationsList()

const remove = useConfirmAction((config) => configurationsService.remove(config.key));
</script>
<style scoped lang="scss">

</style>
