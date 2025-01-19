<template>
  <el-form @submit.native.prevent="save" class="auth-configuration-form">
    <FormRowGroup>
      <BlockItem>
        <FormInput v-model="edited.showLoginPage" title="Show Login Page?" type="switch"/>
      </BlockItem>
      <BlockItem>
        <FormInput v-model="edited.showRegisterPage" title="Show Registration Page?" type="switch"/>
      </BlockItem>
      <BlockItem>
        <FormInput v-model="edited.treatUsernameAs"
                   title="Treat Username As" label="Regarding to username validations"
                   type="select">
          <template #options>
            <el-option label="Email" value="email"/>
            <el-option label="Username" value="username"/>
            <el-option label="Phone" value="phone"/>
          </template>
        </FormInput>
      </BlockItem>
    </FormRowGroup>
    <h3>{{ $t('Additional User Fields') }}</h3>
    <FormRowGroup v-for="(row, index) in edited.additionalUserFields" :key="index">
      <FormInput v-model="row.key" title="Key" type="text" required/>
      <FormInput v-model="row.name" title="Name" type="text" required/>
      <FormInput v-model="row.label" title="Label" type="text" required/>
      <FormInput v-model="row.inputType" title="Input Type" type="select" required>
        <template #options>
          <el-option label="Text" value="text"/>
          <el-option label="Select" value="select"/>
          <el-option label="Radio" value="radio"/>
          <el-option label="Checkbox" value="checkbox"/>
        </template>
      </FormInput>
      <FormInput v-model="row.valueType" title="Value Type" type="select" required>
        <template #options>
          <el-option label="String" value="string"/>
          <el-option label="Number" value="number"/>
          <el-option label="Boolean" value="boolean"/>
        </template>
      </FormInput>
      <FormInput class="flex-0" v-model="row.required" title="Required" type="switch"/>
      <div class="flex-0 remove-row">
        <RemoveButton @click="edited.additionalUserFields.splice(index, 1)"/>
      </div>
    </FormRowGroup>
    <AddMore
        @click="edited.additionalUserFields.push({inputType: 'text',key: undefined ,label: undefined ,name: undefined ,required: false ,valueType: 'string'})"/>
    <h3>{{ $t('Social Logins') }}</h3>
    <FormRowGroup>
      <BlockItem>
        <FormInput v-model="edited.socialLoginsSources.linkedin"
                   placeholder="Select LinkedIn Integration Source"
                   type="select" class="social-input">
          <template #pre>
            <font-awesome-icon :icon="['fab', 'linkedin']" />
            <span class="pad-start">{{ $t('LinkedIn') }}</span>
          </template>
          <template #options>
            <el-option v-for="source in linkedinSources" :key="source._id" :label="source.name" :value="source._id"/>
          </template>
        </FormInput>
      </BlockItem>
    </FormRowGroup>
    <SaveButton :submitting="submitting"/>
  </el-form>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { IAuthConfigurationMetadata, IntegrationSourceKind } from '@qelos/global-types';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import { useIntegrationSources } from '@/modules/integrations/compositions/integration-sources';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';

const props = defineProps({
  kind: String,
  metadata: Object as () => IAuthConfigurationMetadata,
  submitting: Boolean
})

const defaultMetadata: IAuthConfigurationMetadata = {
  treatUsernameAs: 'email',
  showLoginPage: true,
  showRegisterPage: false,
  additionalUserFields: [],
  socialLoginsSources: {},
}

const edited = ref<IAuthConfigurationMetadata>({
  ...defaultMetadata,
  ...(props.metadata || {})
})

const emit = defineEmits(['save']);

const { result: linkedinSources } = useIntegrationSources(IntegrationSourceKind.LinkedIn);

function save() {
  emit('save', edited.value)
}
</script>
<style scoped>
.form-row-group {
  align-items: center;
}
</style>
