import { IBlueprint } from '../models/blueprint';
import { IBlueprintPropertyDescriptor } from '@qelos/global-types';
import BlueprintEntity, { IBlueprintEntity } from '../models/blueprint-entity';
import * as jq from 'node-jq';
import Ajv from 'ajv';

const ajv = new Ajv()

// a json schema that is equal to Record<string, string>
const defaultValidate = ajv.compile({
  type: 'object',
  additionalProperties: {
    type: 'string'
  }
})


export function validateValue(key: string, value: any, property: IBlueprintPropertyDescriptor) {
  if (typeof value === 'undefined' && !property.required) {
    return;
  }
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
  if (property.type === 'object') {
    const validate = property.schema ? ajv.compile(property.schema) : defaultValidate;
    const isValid = validate(value);
    if (!isValid) {
      throw new Error(`Property ${key} must be a valid object`);
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
  if (property.enum && property.enum.length && !property.enum.includes(value)) {
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

export async function updateEntityMapping(blueprint: IBlueprint, entity: IBlueprintEntity) {
  const entries = Object.entries(blueprint.updateMapping);
  await Promise.all(entries
    .map(
      ([key, value]) => jq.run(value, entity).then(result => {
        validateValue(key, result, blueprint.properties[key]);
        entity.metadata[key] = result;
      })
    )
  );
}

export function validateEntityRelations(tenant: string, blueprint: IBlueprint, entity: IBlueprintEntity) {
  return Promise.all(blueprint.relations
    .map(relation => {
      const target = entity.metadata[relation.key];
      if (!target) {
        return;
      }
      return BlueprintEntity.findOne({
        tenant,
        blueprint: relation.target,
        identifier: target,
      }).select('_id')
        .lean()
        .exec()
        .then(targetEntity => {
          if (!targetEntity) {
            throw new Error('relation target not found');
          }
        });
    }))
}