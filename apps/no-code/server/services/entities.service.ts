import { IBlueprint } from '../models/blueprint';
import { IBlueprintPropertyDescriptor, PermissionScope } from '@qelos/global-types';
import BlueprintEntity, { IBlueprintEntity } from '../models/blueprint-entity';
import * as jq from 'node-jq';
import Ajv from 'ajv';
import { ResponseError } from '@qelos/api-kit'
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import mongoose from 'mongoose';

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
      throw new ResponseError(`Property ${key} must be a number`, 406);
    }
    value = Number(value);
  }
  if (property.type === 'boolean') {
    value = !!value;
  }
  if (property.type === 'object') {
    const validate = property.schema ? ajv.compile(property.schema) : defaultValidate;
    const isValid = validate(value);
    if (!isValid) {
      throw new ResponseError(`Property ${key} must be a valid according to schema: ${property.schema?.type || 'object'}`, 406);
    }
  }
  if (property.type === 'string') {
    if (typeof value !== 'string') {
      throw new ResponseError(`Property ${key} must be a string`, 406);
    }
    value = String(value);
    if (property.enum && property.enum.length && !property.enum.includes(value)) {
      throw new ResponseError(`Property ${key} must be one of ${property.enum.join(', ')}`, 406);
    }
  }
  if (property.type === 'file') {
    if (!value?.startsWith?.('http')) {
      throw new ResponseError(`Property ${key} must be a valid file`, 406);
    }
    value = String(value);
  }
  if (property.type === 'date') { // string representation of date YYYY-MM-DD or actual date
    if (new Date(value).toString() === 'Invalid Date') {
      throw new ResponseError(`Property ${key} must be a date`, 406);
    }
    value = value.toString();
  }
  if (property.type === 'datetime') { // actual date
    if (new Date(value).toString() === 'Invalid Date') {
      throw new ResponseError(`Property ${key} must be a datetime`, 406);
    }
    value = new Date(value);
  }
  if (property.type === 'time') { // string representation of time HH:MM
    const [hours, minutes] = value?.split(':');
    if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) {
      throw new ResponseError(`Property ${key} must be a time`, 406);
    }
    value = `${hours}:${minutes}`;
  }
  if (typeof property.min !== 'undefined' && value < property.min) {
    throw new ResponseError(`Property ${key} must be greater than ${property.min}`, 406);
  }
  if (typeof property.max !== 'undefined' && value > property.max) {
    throw new ResponseError(`Property ${key} must be less than ${property.max}`, 406);
  }
  if (property.required && typeof value === 'undefined') {
    throw new ResponseError(`Property ${key} is required`, 406);
  }

  return value;
}

// Requests may send blueprint properties (including relation keys, which are
// plain string properties under the hood) flat at the top level of the body
// instead of nested under `metadata` - mirroring the flat response shape
// entities are returned in by default. Only keys declared on the blueprint
// are picked up, so unrelated top-level fields (user, workspace, etc.) are
// left untouched.
export function extractFlatMetadata(body: any, blueprint: IBlueprint): Record<string, any> {
  const flat: Record<string, any> = {};
  if (!body || !blueprint.properties) {
    return flat;
  }
  for (const key of Object.keys(blueprint.properties)) {
    if (key in body) {
      flat[key] = body[key];
    }
  }
  return flat;
}

// Merges a request body into the metadata that should be validated: existing
// entity metadata, overlaid by any blueprint properties sent flat at the
// top level, overlaid by an explicit `metadata` object - so requests that
// still send the old nested `{ metadata: {...} }` shape keep taking
// precedence over flat top-level fields when both are present.
export function buildEntityMetadataInput(existingMetadata: any, body: any, blueprint: IBlueprint): Record<string, any> {
  const { _id, metadata, ...rest } = body || {};
  const flatMetadata = extractFlatMetadata(rest, blueprint);
  return { ...existingMetadata, ...flatMetadata, ...metadata };
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
          throw new ResponseError(`Property ${key} must be an array`, 406);
        }
        if (isArray) {
          const arr: any[] = [];
          for (const val of value) {
            arr.push(validateValue(key, val, property));
          }
          validData[key] = arr;
        }
      } else {
        validData[key] = validateValue(key, value, property);
      }
    }
  }
  return validData;
}

export async function updateEntityMapping(blueprint: IBlueprint, entity: IBlueprintEntity) {
  if (!blueprint.updateMapping) {
    return;
  }
  const entries = Object.entries(blueprint.updateMapping || {});
  await Promise.all(entries
    .map(
      ([key, value]) => jq.run(value, entity, { output: 'json', input: 'json' }).then(result => {
        if (!blueprint.properties[key]) {
          throw new ResponseError(`Property ${key} not found in blueprint ${blueprint.identifier}`, 400);
        }
        entity.metadata[key] = validateValue(key, result, blueprint.properties[key]);
      })
    )
  );
}

export function validateEntityRelations(tenant: string, blueprint: IBlueprint, entity: IBlueprintEntity) {
  return Promise.all(blueprint.relations.map(relation => {
    const target = entity.metadata?.[relation.key];
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
          throw new ResponseError(`relation target ${relation.target} not found: ${target}`, 406);
        }
      });
  }))
}

export function getEntityIndexes(blueprint: IBlueprint, entity: IBlueprintEntity): string[] {
  const list = blueprint.relations.map(relation => {
    const target = entity.metadata?.[relation.key];
    if (!target) {
      return;
    }
    return `${relation.key}:${target}`;
  })

  return list.filter(Boolean) as string[];
}

export function convertQueryToIndexes(query: any, blueprint: IBlueprint) {
  if (!blueprint.relations?.length) {
    return query;
  }
  const $all: string[] = [];
  blueprint.relations.forEach(relation => {
    const value = query[`metadata.${relation.key}`];
    if (typeof value === 'string') {
      delete query[`metadata.${relation.key}`];
      $all.push(`${relation.key}:${value}`);
    }
  });
  if ($all.length) {
    if (query.indexes instanceof Array) {
      query.indexes = { $in: query.indexes, $all }
    } else {
      query.indexes = { ...query.indexes, $all }
    }
  }

}

export type Full<T> = {
  [P in keyof T]-?: T[P];
}

export function getEntityQuery({ entityIdentifier, blueprint, req, permittedScopes }: {
  entityIdentifier?: string,
  blueprint: IBlueprint,
  req: Full<RequestWithUser>,
  permittedScopes: PermissionScope[] | true
}) {
  const query: any = {
    tenant: req.headers.tenant,
    blueprint: blueprint.identifier,
  };
  if (entityIdentifier) {
    query.identifier = entityIdentifier;
  }
  if (permittedScopes instanceof Array) {
    if (!permittedScopes.includes(PermissionScope.TENANT)) {
      if (blueprint.permissionScope === PermissionScope.WORKSPACE) {
        if (!req.workspace) {
          throw new ResponseError('user is not connected to a workspace', 403);
        }
        // Convert workspace ID to ObjectId for proper matching in aggregation queries
        query.workspace = new mongoose.Types.ObjectId(req.workspace._id);
      } else if (blueprint.permissionScope === PermissionScope.USER) {
        if (!req.user) {
          throw new ResponseError('you must be logged in to access', 401);
        }
        query.user = req.user._id;
      }
    }
  }
  return query;
}