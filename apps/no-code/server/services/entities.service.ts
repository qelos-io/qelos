import { IBlueprint } from '../models/blueprint';
import { IBlueprintPropertyDescriptor } from '@qelos/global-types';

export function validateValue(key: string, value: any, property: IBlueprintPropertyDescriptor) {
  if (property.type === 'number') {
    if (isNaN(value)) {
      throw new Error(`Property ${key} must be a number`);
    }
  }
  if (property.type === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new Error(`Property ${key} must be a boolean`);
    }
  }
  if (property.type === 'string') {
    if (typeof value !== 'string') {
      throw new Error(`Property ${key} must be a string`);
    }
  }
  if (property.type === 'date') {
    if (new Date(value).toString() === 'Invalid Date') {
      throw new Error(`Property ${key} must be a date`);
    }
  }
  if (property.type === 'datetime') {
    if (new Date(value).toString() === 'Invalid Date') {
      throw new Error(`Property ${key} must be a datetime`);
    }
  }
  if (property.type === 'time') {
    const [hours, minutes] = value?.split(':');
    if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) {
      throw new Error(`Property ${key} must be a time`);
    }
  }
  if (property.enum && !property.enum.includes(value)) {
    throw new Error(`Property ${key} must be one of ${property.enum.join(', ')}`);
  }
  if (property.min && value < property.min) {
    throw new Error(`Property ${key} must be greater than ${property.min}`);
  }
  if (property.max && value > property.max) {
    throw new Error(`Property ${key} must be less than ${property.max}`);
  }
  if (property.required && !value) {
    throw new Error(`Property ${key} is required`);
  }
}

export function getValidBlueprintMetadata(metadata: any, blueprint: IBlueprint) {
  const validData = {};
  if (metadata && blueprint.properties) {
    const blueprintMetadataKeys = Object.keys(blueprint.properties);
    for (const key of blueprintMetadataKeys) {
      const value = metadata[key];
      const property = blueprint.properties[key];
      if (property.multi) {
        const isArray = Array.isArray(value);
        if (property.required && !isArray) {
          throw new Error(`Property ${key} must be an array`);
        }
        if (isArray) {
          for (const val of value) {
            validateValue(key, val, property);
          }
        }
      } else {
        validateValue(key, value, property);
      }
      validData[key] = value;
    }
  }
  return validData;
}