<script setup lang="ts">
import { toRef } from 'vue';
import ConfirmMessage from '@/modules/pre-designed/components/ConfirmMessage.vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import sdk from '@/services/sdk';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';

const identifier = defineModel<string>()
const cruds = toRef(usePluginsMicroFrontends(), 'cruds');
const { reloadBlueprintRequirements } = useScreenRequirementsStore();

const props = defineProps<{
  target: 'crud' | 'blueprint',
  resource: string,
}>();

const emit = defineEmits(['removed']);

async function remove(itemId: string) {
  try {
    if (props.target === 'crud') {
      await cruds.value[props.resource].api.remove(itemId);
    } else {
      await sdk.blueprints.entitiesOf(props.resource).remove(itemId);
      reloadBlueprintRequirements(props.resource);
    }
    emit('removed');
  } catch {
    //
  }
}

</script>

<template>
  <ConfirmMessage v-model="identifier" @confirm="remove" />
</template>