import {reactive} from 'vue';
import {useEditedInputModels} from '../../core/compositions/edited-inputs';

const fileUploaderConfigProperty = ['text', 'upload'];

const configurationKeysTypes = {
  logoUrl: fileUploaderConfigProperty,
  themeStylesUrl: fileUploaderConfigProperty,
  colorsPalette: ['palette']
};

const titles = {
  name: 'Website Name',
  language: 'Language',
  direction: 'Text Direction',
  description: 'Description',
  logoUrl: 'Logo',
  slogan: 'Slogan',
  keywords: 'Keywords',
  theme: 'Theme Name',
  themeStylesUrl: 'Theme CSS URL',
  scriptUrl: 'Javascript File URL',
  websiteUrls: 'Websites URLs',
  homeScreen: 'Users Home Screen',
  colorsPalette: 'Colors Palette',
  isActive: 'Active?',
};

const placeholders = {
  language: 'en | he',
  direction: 'ltr | rtl',
  logoUrl: 'https://...',
  themeStylesUrl: 'https://...',
  scriptUrl: 'https://...',
  websiteUrls: 'https://...',
  homeScreen: 'dashboard',
};

function getInputType(value: any) {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'switch'
  return 'text'
}

export function useEditMetadata<T = any>(kind: string, metadata: T) {
  const hardConfigType = kind === 'palettes' ? ['palette'] : null;
  const keys: string[] = Object.keys(metadata);
  const editedValues = reactive<T & { [key: string]: any }>(
    keys.reduce((values, key) => {
      values[key] = null;
      return values;
    }, {}) as any as T & { [key: string]: any }
  );
  const updated = reactive(useEditedInputModels(editedValues, metadata, keys));
  const valuesTypes = reactive(
    keys.reduce((types, key) => {
      const options = hardConfigType ||
        configurationKeysTypes[key] ||
        [getInputType(updated[key])];
      types[key] = {
        title: titles[key] || key,
        placeholder: placeholders[key],
        options,
        selected: options[0],
      };
      return types;
    }, {})
  );

  return {
    keys,
    valuesTypes,
    edited: editedValues,
    updated,
  };
}
