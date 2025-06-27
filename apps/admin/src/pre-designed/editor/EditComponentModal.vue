<template>
  <el-form @submit.stop="submit">
    <el-drawer
        v-model="dialogVisible"
        :title="$t('Edit Component')"
        size="40%"
        class="edit-component-drawer"
        direction="ltr">
      
      <el-tabs v-model="editorMode" class="editor-tabs">
        <el-tab-pane name="common" :label="$t('Common')" />
        <el-tab-pane name="advanced" :label="$t('Advanced')" />
        <el-tab-pane name="code" :label="$t('HTML')" />
      </el-tabs>
      
      <!-- Common Properties Mode -->
      <div v-if="editorMode === 'common'" class="properties-container">
        <el-row :gutter="20">
          <!-- Text Content -->
          <el-col :span="24" v-if="hasTextContent">
            <el-form-item :label="$t('Text Content')">
              <el-input v-model="textContent" type="textarea" rows="3" @change="updateTextContent" />
            </el-form-item>
          </el-col>
          
          <!-- Common Properties -->
          <el-col :span="12" v-if="hasIdAttribute">
            <FormInput 
              :title="$t('ID')"
              type="text"
              v-model="idAttribute" />
          </el-col>
          
          <el-col :span="12">
            <el-form-item :label="$t('Class')">
              <el-select
                v-model="classAttribute"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                collapse-tags
                :placeholder="$t('Select or add classes')"
                style="width: 100%"
                popper-class="class-select-dropdown"
                class="class-select-input"
              >
                <el-option-group :label="$t('Layout')">
                  <el-option 
                    v-for="cls in layoutClasses" 
                    :key="cls.value" 
                    :label="cls.value" 
                    :value="cls.value"
                  >
                    <div class="class-option">
                      <span class="class-name">{{ cls.value }}</span>
                      <span class="class-description">{{ cls.label.split(' - ')[1] }}</span>
                    </div>
                  </el-option>
                </el-option-group>
                <el-option-group :label="$t('Flex')">
                  <el-option 
                    v-for="cls in flexClasses" 
                    :key="cls.value" 
                    :label="cls.value" 
                    :value="cls.value"
                  >
                    <div class="class-option">
                      <span class="class-name">{{ cls.value }}</span>
                      <span class="class-description">{{ cls.label.split(' - ')[1] }}</span>
                    </div>
                  </el-option>
                </el-option-group>
                <el-option-group :label="$t('Spacing')">
                  <el-option 
                    v-for="cls in spacingClasses" 
                    :key="cls.value" 
                    :label="cls.value" 
                    :value="cls.value"
                  >
                    <div class="class-option">
                      <span class="class-name">{{ cls.value }}</span>
                      <span class="class-description">{{ cls.label.split(' - ')[1] }}</span>
                    </div>
                  </el-option>
                </el-option-group>
                <el-option-group :label="$t('Other')">
                  <el-option 
                    v-for="cls in otherClasses" 
                    :key="cls.value" 
                    :label="cls.value" 
                    :value="cls.value"
                  >
                    <div class="class-option">
                      <span class="class-name">{{ cls.value }}</span>
                      <span class="class-description">{{ cls.label.split(' - ')[1] }}</span>
                    </div>
                  </el-option>
                </el-option-group>
                
                <el-option-group v-if="customClasses.length > 0" :label="$t('Custom')">
                  <el-option 
                    v-for="cls in customClasses" 
                    :key="cls" 
                    :label="cls" 
                    :value="cls"
                  >
                    <div class="class-option">
                      <span class="class-name">{{ cls }}</span>
                      <span class="class-description">{{ $t('Custom class') }}</span>
                    </div>
                  </el-option>
                </el-option-group>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="24" v-if="commonProperties.length > 0">
            <el-divider content-position="left">{{ $t('Component Properties') }}</el-divider>
            <el-row :gutter="20">
              <el-col :span="12" v-for="prop in commonProperties" :key="prop.propName">
                <FormInput
                  :type="prop.type"
                  :title="prop.title"
                  :options="prop.options"
                  v-model="prop.value" />
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </div>
      
      <!-- Advanced Properties Mode -->
      <div v-if="editorMode === 'advanced'" class="properties-container">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="$t('Style')">
              <div class="style-editor">
                <div v-for="(styleValue, index) in styleProperties" :key="index" class="style-property">
                  <el-select
                    v-model="styleValue.property"
                    filterable
                    allow-create
                    default-first-option
                    :placeholder="$t('Property')"
                    @change="updateStyleAttribute"
                    class="style-property-name"
                  >
                    <el-option-group :label="$t('Layout')">
                      <el-option v-for="prop in layoutStyleProps" :key="prop.value" :label="prop.label" :value="prop.value" />
                    </el-option-group>
                    <el-option-group :label="$t('Typography')">
                      <el-option v-for="prop in typographyStyleProps" :key="prop.value" :label="prop.label" :value="prop.value" />
                    </el-option-group>
                    <el-option-group :label="$t('Colors')">
                      <el-option v-for="prop in colorStyleProps" :key="prop.value" :label="prop.label" :value="prop.value" />
                    </el-option-group>
                    <el-option-group :label="$t('Spacing')">
                      <el-option v-for="prop in spacingStyleProps" :key="prop.value" :label="prop.label" :value="prop.value" />
                    </el-option-group>
                  </el-select>
                  
                  <el-input
                    v-model="styleValue.value"
                    :placeholder="$t('Value')"
                    @change="updateStyleAttribute"
                    class="style-property-value"
                  />
                  
                  <el-button
                    type="danger"
                    circle
                    size="small"
                    @click="removeStyleProperty(index)"
                    icon="icon-delete"
                    class="style-property-delete"
                  />
                </div>
                
                <el-button
                  type="primary"
                  size="small"
                  @click="addStyleProperty"
                  icon="icon-plus"
                  class="add-style-property"
                >
                  {{ $t('Add Property') }}
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          
          <el-col :span="24" v-if="advancedProperties.length > 0">
            <el-divider content-position="left">{{ $t('All Properties') }}</el-divider>
            <el-row :gutter="20">
              <el-col :span="12" v-for="prop in advancedProperties" :key="prop.propName">
                <FormInput
                  :type="prop.type"
                  :title="prop.title"
                  :options="prop.options"
                  v-model="prop.value" />
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </div>
      
      <!-- Code Editor Mode -->
      <div v-if="editorMode === 'code'" class="code-editor-container">
        <Monaco v-model="modelHTML"
                language="html"
                style="height:100%;"/>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false" native-type="button">{{ $t('Cancel') }}</el-button>
          <el-button type="primary" native-type="submit">
            {{ $t('Confirm') }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </el-form>
</template>

<script lang="ts" setup>
import { capitalize, computed, provide, ref, watch } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';

import Monaco from '@/modules/users/components/Monaco.vue';

const editorMode = ref('common');
const dialogVisible = ref(true);
const model = defineModel<HTMLElement>();
const emit = defineEmits(['save']);
// Element content and attributes
const modelHTML = ref('');
const textContent = ref('');
const idAttribute = ref('');
const classAttribute = ref('');
const styleAttribute = ref('');
const styleProperties = ref([]);
const customClasses = ref([]);

// Flags for conditional rendering
const hasTextContent = ref(false);
const hasIdAttribute = ref(false);

// Class suggestions from main.scss
const layoutClasses = [
  { value: 'container', label: 'container - margin: 10px' },
  { value: 'flex-container', label: 'flex-container - flex column layout' },
  { value: 'relative', label: 'relative - position: relative' },
  { value: 'property-card', label: 'property-card - card with min/max width' }
];

const flexClasses = [
  { value: 'flex-row', label: 'flex-row - horizontal flex layout' },
  { value: 'flex-row-column', label: 'flex-row-column - responsive flex layout' },
  { value: 'flex-middle', label: 'flex-middle - align items center' },
  { value: 'flex-space', label: 'flex-space - space between items' },
  { value: 'flex-wrap', label: 'flex-wrap - wrap flex items' },
  { value: 'flex-0', label: 'flex-0 - flex: 0' },
  { value: 'flex-1', label: 'flex-1 - flex: 1' },
  { value: 'flex-2', label: 'flex-2 - flex: 2' },
  { value: 'flex-3', label: 'flex-3 - flex: 3' },
  { value: 'flex-4', label: 'flex-4 - flex: 4' },
  { value: 'flex-5', label: 'flex-5 - flex: 5' },
  { value: 'flex-6', label: 'flex-6 - flex: 6' }
];

const spacingClasses = [
  { value: 'pad-top', label: 'pad-top - padding-top: 10px' },
  { value: 'pad-start', label: 'pad-start - padding-inline-start: 10px' }
];

const otherClasses = [
  { value: 'small', label: 'small - font-size: 80%' },
  { value: 'danger', label: 'danger - color: danger' },
  { value: 'property-row', label: 'property-row - flex column with padding' },
  { value: 'centered', label: 'centered - center content' },
  { value: 'link', label: 'link - link styling' },
  { value: 'remove-row', label: 'remove-row - margin-bottom: 18px' }
];

// Style property suggestions
const layoutStyleProps = [
  { value: 'display', label: 'display' },
  { value: 'position', label: 'position' },
  { value: 'width', label: 'width' },
  { value: 'height', label: 'height' },
  { value: 'max-width', label: 'max-width' },
  { value: 'max-height', label: 'max-height' },
  { value: 'min-width', label: 'min-width' },
  { value: 'min-height', label: 'min-height' },
  { value: 'overflow', label: 'overflow' },
  { value: 'z-index', label: 'z-index' },
  { value: 'flex', label: 'flex' },
  { value: 'flex-direction', label: 'flex-direction' },
  { value: 'justify-content', label: 'justify-content' },
  { value: 'align-items', label: 'align-items' }
];

const typographyStyleProps = [
  { value: 'font-size', label: 'font-size' },
  { value: 'font-weight', label: 'font-weight' },
  { value: 'font-family', label: 'font-family' },
  { value: 'text-align', label: 'text-align' },
  { value: 'line-height', label: 'line-height' },
  { value: 'letter-spacing', label: 'letter-spacing' },
  { value: 'text-decoration', label: 'text-decoration' },
  { value: 'text-transform', label: 'text-transform' }
];

const colorStyleProps = [
  { value: 'color', label: 'color' },
  { value: 'background-color', label: 'background-color' },
  { value: 'border-color', label: 'border-color' },
  { value: 'border', label: 'border' },
  { value: 'border-radius', label: 'border-radius' },
  { value: 'box-shadow', label: 'box-shadow' },
  { value: 'opacity', label: 'opacity' }
];

const spacingStyleProps = [
  { value: 'margin', label: 'margin' },
  { value: 'margin-top', label: 'margin-top' },
  { value: 'margin-right', label: 'margin-right' },
  { value: 'margin-bottom', label: 'margin-bottom' },
  { value: 'margin-left', label: 'margin-left' },
  { value: 'padding', label: 'padding' },
  { value: 'padding-top', label: 'padding-top' },
  { value: 'padding-right', label: 'padding-right' },
  { value: 'padding-bottom', label: 'padding-bottom' },
  { value: 'padding-left', label: 'padding-left' },
  { value: 'gap', label: 'gap' }
];

// Define common property types and options
const colorOptions = [
  { value: '', label: 'Default' },
  { value: 'primary', label: 'Primary' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
  { value: 'info', label: 'Info' }
];

const sizeOptions = [
  { value: '', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'default', label: 'Medium' },
  { value: 'small', label: 'Small' }
];

const alignOptions = [
  { value: '', label: 'Default' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' }
];

const displayOptions = [
  { value: '', label: 'Default' },
  { value: 'block', label: 'Block' },
  { value: 'inline', label: 'Inline' },
  { value: 'flex', label: 'Flex' },
  { value: 'grid', label: 'Grid' },
  { value: 'none', label: 'None' }
];

// Common property names that should be shown in the Common tab
const commonPropertyNames = [
  'id', 'class', 'type', 'size', 'color', 'disabled', 'readonly', 'required',
  'placeholder', 'label', 'title', 'name', 'value', 'src', 'href', 'alt',
  'target', 'rel', 'width', 'height'
];

// Function to determine property type based on attribute name and value
function determinePropertyType(propName: string, value: string) {
  // Handle boolean values
  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    return 'switch';
  }
  
  // Handle enums
  const enumProps = {
    'type': colorOptions,
    'size': sizeOptions,
    'text-align': alignOptions,
    'align': alignOptions,
    'display': displayOptions
  };
  
  const name = propName.includes(':') ? propName.split(':')[1] : propName;
  
  if (Object.keys(enumProps).includes(name)) {
    return { type: 'select', options: enumProps[name] };
  }
  
  // Handle specific property types
  if (name === 'color' || name.endsWith('-color')) {
    return 'color';
  }
  
  if (name === 'src' || name === 'href' || name === 'url') {
    return 'url';
  }
  
  if (name === 'height' || name === 'width' || name === 'max-height' || name === 'max-width' || 
      name === 'min-height' || name === 'min-width' || name.includes('margin') || name.includes('padding')) {
    return 'text'; // Could be specialized in the future
  }
  
  return 'text';
}

// Process attributes and create property objects
function processAttributes() {
  if (!model.value) return [];
  
  return model.value.getAttributeNames().map(propName => {
    const name = propName.includes(':') ? propName.split(':')[1] : propName;
    const value = model.value.getAttribute(propName);
    const propType = determinePropertyType(propName, value);
    
    if (typeof propType === 'object') {
      return {
        propName,
        title: capitalize(name.replace(/-/g, ' ')),
        value: value,
        type: propType.type,
        options: propType.options
      };
    }
    
    return {
      propName,
      title: capitalize(name.replace(/-/g, ' ')),
      value: propType === 'switch' ? value === 'true' : value,
      type: propType
    };
  });
}

// Initialize model properties
const modelProps = ref(processAttributes());

// Extract special properties
function initializeSpecialProperties() {
  if (!model.value) return;
  
  // Check if element has text content that can be edited
  const nodeType = model.value.nodeType;
  const tagName = model.value.tagName?.toLowerCase();
  const isTextEditableElement = !['img', 'br', 'hr', 'input', 'canvas'].includes(tagName);
  
  hasTextContent.value = isTextEditableElement;
  if (hasTextContent.value) {
    textContent.value = model.value.innerHTML;
  }
  
  // Extract ID attribute
  hasIdAttribute.value = true; // Always show ID field even if not set
  idAttribute.value = model.value.getAttribute('id') || '';
  
  // Extract class attribute - handle as array for multi-select
  const classValue = model.value.getAttribute('class') || '';
  classAttribute.value = classValue ? classValue.split(' ').filter(Boolean) : [];
  
  // Check for custom classes
  updateCustomClasses();
  
  // Extract style attribute and parse into properties
  styleAttribute.value = model.value.getAttribute('style') || '';
  parseStyleAttribute();
}

// Parse style attribute into individual properties
function parseStyleAttribute() {
  styleProperties.value = [];
  
  if (!styleAttribute.value) return;
  
  // Split style string into individual property-value pairs
  const stylePairs = styleAttribute.value.split(';').filter(Boolean);
  
  stylePairs.forEach(pair => {
    const [property, value] = pair.split(':').map(item => item.trim());
    if (property && value) {
      styleProperties.value.push({ property, value });
    }
  });
  
  // Add an empty property if none exist
  if (styleProperties.value.length === 0) {
    addStyleProperty();
  }
}

// Add a new style property
function addStyleProperty() {
  styleProperties.value.push({ property: '', value: '' });
}

// Remove a style property
function removeStyleProperty(index) {
  styleProperties.value.splice(index, 1);
  updateStyleAttribute();
}

// Update the style attribute from individual properties
function updateStyleAttribute() {
  const validProperties = styleProperties.value.filter(prop => prop.property && prop.value);
  
  if (validProperties.length === 0) {
    styleAttribute.value = '';
    return;
  }
  
  styleAttribute.value = validProperties
    .map(prop => `${prop.property}: ${prop.value}`)
    .join('; ') + ';';
}

initializeSpecialProperties();

// Function to update custom classes list
function updateCustomClasses() {
  if (!classAttribute.value || !Array.isArray(classAttribute.value)) return;
  
  // Get all predefined class values
  const predefinedClasses = [
    ...layoutClasses.map(c => c.value),
    ...flexClasses.map(c => c.value),
    ...spacingClasses.map(c => c.value),
    ...otherClasses.map(c => c.value)
  ];
  
  // Filter out classes that aren't in the predefined list
  customClasses.value = classAttribute.value.filter(cls => !predefinedClasses.includes(cls));
}

// Watch for changes to classAttribute to update custom classes
watch(classAttribute, () => {
  updateCustomClasses();
}, { deep: true });

// Computed properties for the tabs
const commonProperties = computed(() => {
  return modelProps.value.filter(prop => {
    const name = prop.propName.includes(':') ? prop.propName.split(':')[1] : prop.propName;
    return commonPropertyNames.includes(name) && 
           name !== 'id' && name !== 'class' && name !== 'style';
  });
});

const advancedProperties = computed(() => {
  return modelProps.value.filter(prop => {
    const name = prop.propName.includes(':') ? prop.propName.split(':')[1] : prop.propName;
    return name !== 'style' && name !== 'class';
  });
});
provide('editableManager', ref(false));

// Update text content of the element
function updateTextContent() {
  if (!model.value || !hasTextContent.value) return;
  model.value.innerHTML = textContent.value;
}

// Watch for dialog visibility
watch(dialogVisible, () => {
  if (!dialogVisible.value) {
    model.value = null;
  }
});

// Watch for editor mode changes
watch(editorMode, (newMode, oldMode) => {
  if (newMode === 'code' && (oldMode === 'common' || oldMode === 'advanced')) {
    // Apply changes before switching to code editor
    applyChangesToModel();
    modelHTML.value = model.value.outerHTML;
  } else if ((newMode === 'common' || newMode === 'advanced') && oldMode === 'code') {
    // Apply HTML changes and refresh properties
    setHtmlToModel();
    refreshProperties();
  }
  
});

// Apply all changes from UI to the model
function applyChangesToModel() {
  // Apply special properties
  if (idAttribute.value) {
    model.value.setAttribute('id', idAttribute.value);
  } else {
    model.value.removeAttribute('id');
  }
  
  // Apply class attribute (join array to string)
  if (classAttribute.value && classAttribute.value.length > 0) {
    model.value.setAttribute('class', Array.isArray(classAttribute.value) ? 
      classAttribute.value.join(' ') : classAttribute.value);
  } else {
    model.value.removeAttribute('class');
  }
  
  // Apply style attribute (ensure it's up to date from style properties)
  updateStyleAttribute();
  if (styleAttribute.value) {
    model.value.setAttribute('style', styleAttribute.value);
  } else {
    model.value.removeAttribute('style');
  }
  
  // Apply text content if changed
  if (hasTextContent.value) {
    model.value.innerHTML = textContent.value;
  }
  
  // Apply other properties
  modelProps.value.forEach(prop => {
    if (prop.propName !== 'id' && prop.propName !== 'class' && prop.propName !== 'style') {
      try {
        model.value.setAttribute(prop.propName, prop.value.toString());
      } catch {
        // Handle errors silently
      }
    }
  });
}

// Refresh all properties from the model
function refreshProperties() {
  // Refresh model properties
  modelProps.value = processAttributes();
  
  // Refresh special properties
  initializeSpecialProperties();
}

// Set HTML directly to the model
function setHtmlToModel() {
  if (!modelHTML.value) return;
  
  const template = document.createElement('template');
  template.innerHTML = modelHTML.value;
  const newEl = template.content.firstChild as HTMLElement;
  
  if (!newEl) return;
  
  model.value.innerHTML = newEl.innerHTML;
  
  // Remove all existing attributes
  model.value.getAttributeNames().forEach(attr => {
    model.value.removeAttribute(attr);
  });
  
  // Add attributes from the new element
  newEl.getAttributeNames().forEach(attr => {
    try {
      model.value.setAttribute(attr, newEl.getAttribute(attr));
    } catch {
      // Handle errors silently
    }
  });
}
// Submit changes when form is submitted
function submit() {
  if (editorMode.value === 'common' || editorMode.value === 'advanced') {
    applyChangesToModel();
  } else if (editorMode.value === 'code') {
    setHtmlToModel();
  }
  
  emit('save', model.value);
  dialogVisible.value = false;
}
</script>
<style scoped>
.dialog-footer {
  display: flex;
  justify-content: space-between;
}

.properties-container {
  height: calc(100% - 54px);
  overflow-y: auto;
  padding: 0 10px;
}

.code-editor-container {
  height: calc(100% - 54px);
}

.editor-tabs {
  margin-bottom: 16px;
}

.style-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.style-property {
  display: flex;
  align-items: center;
  gap: 8px;
}

.style-property-name {
  flex: 1;
  min-width: 150px;
}

.style-property-value {
  flex: 1;
}

.style-property-delete {
  flex: 0;
}

.add-style-property {
  align-self: flex-start;
  margin-top: 8px;
}
</style>

<style lang="scss">
.edit-component-drawer {
  --el-drawer-padding-primary: 10px;
  
  .el-drawer__header {
    margin-bottom: 10px;
  }
  
  .el-tabs__nav-wrap {
    padding: 0 10px;
  }
  
  .el-divider__text {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }
  
  .el-form-item {
    margin-bottom: 16px;
  }
}

.class-option {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.class-name {
  font-weight: 600;
  color: var(--el-color-primary);
}

.class-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.class-select-input {
  .el-select__wrapper {
    padding-right: 30px !important;
  }
  
  .el-select__tags {
    flex-wrap: wrap;
    max-height: 80px;
    overflow-y: auto;
    scrollbar-width: thin;
    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: var(--el-border-color-lighter);
      border-radius: 4px;
    }
  }
  
  .el-tag {
    max-width: 100%;
    margin: 2px 4px 2px 0;
  }
  
  .el-select__tags-text {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.class-select-dropdown {
  .el-select-dropdown__item {
    height: auto;
    padding: 5px 20px;
    line-height: 1.5;
  }

  .el-select-group__wrap:not(:last-of-type) {
    margin-bottom: 10px;
  }

  .el-select-group__title {
    padding: 10px 20px 5px;
    font-weight: 600;
    font-size: 13px;
  }
}
</style>