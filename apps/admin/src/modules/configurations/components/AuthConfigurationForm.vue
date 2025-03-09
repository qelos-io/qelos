<template>
  <div class="flex-row">
    <el-form @submit.native.prevent="save" class="auth-configuration-form flex-2">
      <div class="flex-row-column">
        <BlockItem>
          <FormInput v-model="edited.showLoginPage" title="Show Login Page?" type="switch"/>

          <div class="flex-row">
            <div class="position-option left" @click="edited.formPosition = 'left'"
                 :class="{selected: edited.formPosition === 'left'}"/>
            <div class="position-option right" @click="edited.formPosition = 'right'"
                 :class="{selected: edited.formPosition === 'right'}"/>
            <div class="position-option top" @click="edited.formPosition = 'top'"
                 :class="{selected: edited.formPosition === 'top'}"/>
            <div class="position-option bottom" @click="edited.formPosition = 'bottom'"
                 :class="{selected: edited.formPosition === 'bottom'}"/>
          </div>
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
      </div>
      <BlockItem>
        <FormInput v-model="edited.loginTitle"
                   title="Title of Login Page"
                   :placeholder="$t('Welcome')">
          <template #options>
            <el-option label="Email" value="email"/>
            <el-option label="Username" value="username"/>
            <el-option label="Phone" value="phone"/>
          </template>
        </FormInput>
      </BlockItem>
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
      <div class="flex-row-column">
        <BlockItem>
          <FormInput v-model="edited.allowSocialAutoRegistration" title="Auto register non-existing users?"
                     type="switch"/>
        </BlockItem>
        <BlockItem class="flex-1">
          <div v-if="sourcedLoaded && !linkedinSources?.length">
            <font-awesome-icon :icon="['fab', 'linkedin']"/>
            <span class="pad-start">{{ $t('LinkedIn') }}</span>
            <el-alert :closable="false" type="info">
              {{ $t('You have not integrated any LinkedIn connections.') }}
              <router-link
                  class="primary-link"
                  :to="{name: 'integrations-sources', params: { kind: 'linkedin'}}">
                {{ $t('Navigate to LinkedIn Connections') }}
              </router-link>
              {{ $t('to create one.') }}
            </el-alert>
          </div>
          <FormInput v-else v-model="edited.socialLoginsSources.linkedin"
                     placeholder="Select LinkedIn Integration Source"
                     type="select" class="social-input">
            <template #pre>
              <font-awesome-icon :icon="['fab', 'linkedin']"/>
              <span class="pad-start">{{ $t('LinkedIn') }}</span>
            </template>
            <template #options>
              <el-option :label="`(${$t('none')})`" :value="null"/>
              <el-option v-for="source in linkedinSources" :key="source._id" :label="source.name" :value="source._id"/>
            </template>
          </FormInput>
        </BlockItem>
      </div>
      <SaveButton :submitting="submitting"/>
    </el-form>
    <Login v-if="!$isMobile" class="login-demo flex-1" :auth-config="edited"/>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { IAuthConfigurationMetadata, IntegrationSourceKind } from '@qelos/global-types';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import Login from '@/modules/core/Login.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';

const props = defineProps({
  kind: String,
  metadata: Object as () => IAuthConfigurationMetadata,
  submitting: Boolean
})

const defaultMetadata: IAuthConfigurationMetadata = {
  treatUsernameAs: 'email',
  formPosition: 'right',
  loginTitle: '',
  showLoginPage: true,
  showRegisterPage: false,
  allowSocialAutoRegistration: true,
  additionalUserFields: [],
  socialLoginsSources: {},
}

const edited = ref<IAuthConfigurationMetadata>({
  ...defaultMetadata,
  ...(props.metadata || {})
})

const emit = defineEmits(['save']);

const { groupedSources, loaded: sourcedLoaded } = toRefs(useIntegrationSourcesStore())

const linkedInSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.LinkedIn] || []
})

function save() {
  emit('save', edited.value)
}
</script>
<style scoped>
.form-row-group {
  align-items: center;
}

.login-demo {
  border: 4px solid var(--border-color);
  margin-inline-end: 10px;
  zoom: 0.5;
}

.position-option {
  width: 36px;
  height: 36px;
  border: 1px solid #ddd;
  margin: 5px;
  cursor: pointer;

  &.left {
    border-left: 4px solid #ccc;
  }

  &.right {
    border-right: 4px solid #ccc;
  }

  &.top {
    border-top: 4px solid #ccc;
  }

  &.bottom {
    border-bottom: 4px solid #ccc;
  }

  &.selected {
    background: var(--main-color-light);
  }
}
</style>
