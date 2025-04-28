<template>
  <div class="flex-row">
    <el-form @submit.native.prevent="save" class="auth-configuration-form flex-2">
        <div class="flex-row-column">
        <BlockItem>
          <FormInput v-model="edited.showLoginPage" title="Show Login Page?" type="switch"/>

          <div class="flex-row positions-list">
                  <!-- Position options -->
            <div class="position-option left" @click="edited.formPosition = 'left'"
                 :class="{selected: edited.formPosition === 'left'}"/>
            <div class="position-option right" @click="edited.formPosition = 'right'"
                 :class="{selected: edited.formPosition === 'right'}"/>
            <div class="position-option center" @click="edited.formPosition = 'center'"
                 :class="{selected: edited.formPosition === 'center'}">
              <div class="inner"/>
            </div>
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
      <!-- Login Title and Background Image -->
      <BlockItem>
        <FormRowGroup>
          <BlocksSelector v-model="edited.slots.loginHeader" title="Header Content Box"/>
          <BlocksSelector v-model="edited.slots.loginFooter" title="Footer Content Box"/>
        </FormRowGroup>
        <FormInput v-model="edited.loginTitle"
                   :disabled="!!edited.slots?.loginHeader"
                   title="Title of Login Page"
                   :placeholder="$t('Welcome')">
          <template #options>
            <el-option label="Email" value="email"/>
            <el-option label="Username" value="username"/>
            <el-option label="Phone" value="phone"/>
          </template>
        </FormInput>
        <FormInput v-model="edited.backgroundImage" title="Background Image" type="upload"/>
      </BlockItem>

       <!--  Disable Username/Password Login. Adds a switch to control the 'disableUsernamePassword' flag.   -->
      <BlockItem>
          <FormInput
              v-model="edited.disableUsernamePassword"
              title="Disable Username/Password Login?"
              label="If enabled, users can only log in via Social Logins (if configured)."
              type="switch"
          />
   
          <el-alert v-if="edited.disableUsernamePassword && !hasSocialLoginConfigured" type="warning" :closable="false" show-icon>
              {{ $t('Warning: You are disabling username/password login, but no Social Login methods (like LinkedIn) seem to be configured in this specific configuration. Ensure users have an alternative way to log in.') }}
          </el-alert>
      </BlockItem>
  <!-- Additional User Fields  -->
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
          <div v-if="sourcedLoaded && !linkedInSources?.length">
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
              <el-option v-for="source in linkedInSources" :key="source._id" :label="source.name" :value="source._id"/>
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
import { ElMessage } from 'element-plus';
import BlocksSelector from '@/modules/blocks/components/BlocksSelector.vue';

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
  slots: {},
   disableUsernamePassword: false // Default to false
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

//  Computed property to check if any social login is configured 
const hasSocialLoginConfigured = computed(() => {
    // Check if the linkedin source ID is set and not null/empty
    return !!edited.value.socialLoginsSources?.linkedin;

});

async function save() {
  // VALIDATION: Prevent disabling username/password if no alternative is set
  if (edited.value.disableUsernamePassword && !hasSocialLoginConfigured.value) {
     ElMessage({
       type: 'error',
       message: 'Cannot disable Username/Password login without configuring at least one Social Login method (e.g., LinkedIn).',
       duration: 5000 
     });
     return; // Stop the save process
  }

  emit('save', edited.value);
}

// function save() {
//   emit('save', edited.value)
// }
</script>
<style scoped>
.login-demo {
  border: 4px solid var(--border-color);
  margin-inline-end: 10px;
  zoom: 0.5;
}

.positions-list {
  flex-wrap: wrap;
}

.position-option {
  display: block;
  width: 36px;
  height: 36px;
  border: 1px solid #ddd;
  margin: 5px;
  cursor: pointer;

  &.left {
    border-left: 4px solid #759b7d;
  }

  &.right {
    border-right: 4px solid #759b7d;
  }

  &.top {
    border-top: 4px solid #759b7d;
  }

  &.bottom {
    border-bottom: 4px solid #759b7d;
  }

  &.center {
    position: relative;

    .inner {
      position: absolute;
      top: 15%;
      bottom: 15%;
      left: 15%;
      right: 15%;
      border: 4px solid #759b7d;
    }
  }

  &.selected {
    background-color: #cfcfcf;
  }
}
</style>
