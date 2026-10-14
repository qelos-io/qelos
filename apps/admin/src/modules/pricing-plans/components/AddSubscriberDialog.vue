<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { BillableEntityType } from '@qelos/global-types';
import workspacesService from '@/services/apis/workspaces-service';
import usersService from '@/services/apis/users-service';

const open = defineModel<boolean>({ default: false });
/** B2C tenants bill users, B2B tenants bill workspaces */
const props = withDefaults(defineProps<{ entityType?: BillableEntityType }>(), { entityType: 'workspace' });
const emit = defineEmits<{ pick: [entity: { type: BillableEntityType; id: string }] }>();

const { t } = useI18n();
const type = ref<BillableEntityType>(props.entityType);
const selected = ref('');
const loading = ref(false);
const options = ref<{ id: string; label: string; hint?: string }[]>([]);

async function load() {
  loading.value = true;
  selected.value = '';
  try {
    if (type.value === 'workspace') {
      const list = ((await workspacesService.getOne('all')) as unknown as { _id: string; name: string }[]) || [];
      options.value = list.map((workspace) => ({ id: workspace._id, label: workspace.name }));
    } else {
      const list = ((await usersService.getAll()) as any[]) || [];
      options.value = list.map((user) => ({
        id: user._id,
        label: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email || user._id,
        hint: user.email,
      }));
    }
  } catch {
    options.value = [];
  } finally {
    loading.value = false;
  }
}

watch(() => props.entityType, (value) => (type.value = value));
watch([open, type], ([isOpen]) => isOpen && load(), { immediate: true });

const canContinue = computed(() => !!selected.value);

function confirm() {
  emit('pick', { type: type.value, id: selected.value });
  open.value = false;
}
</script>

<template>
  <el-dialog v-model="open" :title="$t('Add subscriber')" width="440px" append-to-body>
    <p class="intro">{{ $t('Pick an account, then choose its plan. The plan can be attached without going through checkout.') }}</p>

    <el-select
      v-model="selected"
      class="picker"
      filterable
      :loading="loading"
      :placeholder="type === 'workspace' ? $t('Select a workspace') : $t('Select a user')"
      :aria-label="type === 'workspace' ? $t('Select a workspace') : $t('Select a user')"
    >
      <el-option v-for="option in options" :key="option.id" :label="option.label" :value="option.id">
        <span dir="auto">{{ option.label }}</span>
        <small v-if="option.hint" class="hint" dir="ltr">{{ option.hint }}</small>
      </el-option>
    </el-select>

    <template #footer>
      <el-button @click="open = false">{{ $t('Cancel') }}</el-button>
      <el-button type="primary" :disabled="!canContinue" @click="confirm">{{ $t('Continue') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.intro {
  margin: 0 0 16px;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.picker {
  inline-size: 100%;
}

.hint {
  margin-inline-start: 10px;
  color: var(--el-text-color-secondary);
}
</style>
