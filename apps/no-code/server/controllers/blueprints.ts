import Blueprint, { IBlueprint } from '../models/blueprint';
import { getEntityModel, pickEntityCollection } from '../services/entity-storage.service';
import { evictBlueprintCache, getBlueprintCacheKey } from '../services/blueprints.service';
import { cacheManager } from '../services/cache-manager';
import logger from '../services/logger';
import { IBlueprintPropertyDescriptor, BlueprintPropertyType } from '@qelos/global-types';

/**
 * Validates and sanitizes a blueprint property descriptor
 * Only allows specific properties: title, type, required, multi, min, max, enum, description
 */
function validateBlueprintProperty(p: IBlueprintPropertyDescriptor): IBlueprintPropertyDescriptor {
  // validate descriptor properties
  const { title, type, required, multi, min, max, enum: e, description, schema } = p;
  
  // return all valid properties, including null, 0, false values
  const data: IBlueprintPropertyDescriptor = {
    title,
    description: description || '',
    type: typeof type === 'string' ? type : BlueprintPropertyType.STRING,
    required: !!required,
    multi: !!multi,
  };
  if (min !== undefined) data.min = min;
  if (max !== undefined) data.max = max;
  if (e !== undefined) data.enum = e;
  if (type === BlueprintPropertyType.OBJECT && schema !== undefined) data.schema = schema;
  return data;
}

/**
 * Validates and processes blueprint properties as a Record object
 * @param properties Record of property descriptors
 * @returns Validated properties record
 */
function validateBlueprintProperties(properties?: Record<string, IBlueprintPropertyDescriptor>): Record<string, IBlueprintPropertyDescriptor> {
  if (!properties) return {};
  
  const validatedProperties: Record<string, IBlueprintPropertyDescriptor> = {};
  
  for (const key in properties) {
    const property = properties[key];
    if (property && property.title && property.type) {
      validatedProperties[key] = validateBlueprintProperty(property);
    }
  }
  
  return validatedProperties;
}

const VIEWER_FIELDS = 'tenant identifier name description properties created updated';

export async function getAllBlueprints(req, res) {
  const query: Record<string, any> = {
    tenant: req.headers.tenant,
  }
  if (typeof req.query.name === 'string') {
    query.name = { $regex: req.query.name, $options: 'i' }
  }
  if (typeof req.query.description === 'string') {
    query.description = { $regex: req.query.description, $options: 'i' }
  }
  if (typeof req.query.identifier === 'string') {
    query.identifier = { $in: req.query.identifier.split(',') }
  }
  const list = await Blueprint.find(query, req.user?.isPrivileged ? undefined : VIEWER_FIELDS)
    .lean()
    .exec()

  res.json(list).end()
}

export async function getSingleBlueprint(req, res) {
  const blueprintIdentifier = req.params.blueprintIdentifier;

  const blueprint = await Blueprint.findOne({
    tenant: req.headers.tenant,
    identifier: blueprintIdentifier
  }, req.user?.isPrivileged ? undefined : VIEWER_FIELDS)
    .lean()
    .exec()

  res.json(blueprint).end();
}

export async function createBlueprint(req, res) {
  // storage is assigned by the system only, never from the request
  const { storage, ...body } = req.body;
  const blueprint = new Blueprint({
    ...body,
    tenant: req.headers.tenant,
    storage: { collection: pickEntityCollection(req.headers.tenant, body.identifier) },
  });

  try {
    blueprint.properties = validateBlueprintProperties(req.body.properties);
    await blueprint.save();
    cacheManager.setItem(getBlueprintCacheKey(req.headers.tenant, blueprint.identifier), JSON.stringify(blueprint)).catch(() => undefined)
    res.json(blueprint).end();
  } catch (err) {
    logger.error(err);
    res.status(400).json({ message: 'failed to create a blueprint' }).end();
  }
}

export async function updateBlueprint(req, res) {
  const bluePrintIdentifier = req.params.blueprintIdentifier;
  let blueprint: IBlueprint | null;
  try {
    blueprint = await Blueprint
      .findOne({
        tenant: req.headers.tenant,
        identifier: bluePrintIdentifier,
      })
      .exec()

    if (!blueprint) {
      res.status(404).json({ message: 'blueprint not found' }).end();
      return;
    }
  } catch {
    res.status(500).json({ message: 'something went wrong with blueprint' }).end();
    return;
  }

  const { tenant, identifier, created, storage, ...permittedData } = req.body;

  // Apply validated properties if they exist in the request
  if (req.body.properties) {
    permittedData.properties = validateBlueprintProperties(req.body.properties);
  }

  Object.assign(blueprint, permittedData);
  blueprint.updated = new Date();

  try {
    await blueprint.save();
    cacheManager.setItem(`blueprint:${req.headers.tenant}:${bluePrintIdentifier}`, JSON.stringify(blueprint)).catch()
    res.json(blueprint).end();
  } catch {
    res.status(400).json({ message: 'failed to update blueprint' }).end();
  }
}

export async function patchBlueprint(req, res) {
  const bluePrintIdentifier = req.params.blueprintIdentifier;
  let blueprint: IBlueprint | null;
  try {
    blueprint = await Blueprint
      .findOne({
        tenant: req.headers.tenant,
        identifier: bluePrintIdentifier,
      })
      .exec()

    if (!blueprint) {
      res.status(404).json({ message: 'blueprint not found' }).end();
      return;
    }
  } catch {
    res.status(500).json({ message: 'something went wrong with blueprint' }).end();
    return;
  }

  const { tenant, identifier, created, permissions, storage, ...permittedData } = req.body as Partial<IBlueprint>;

  const relations = [
    ...blueprint.relations,
    ...(permittedData.relations || []),
  ]
    .reduce((map, item) => {
      map[item.key] = item;
      return map;
    }, {});

  Object.assign(
    blueprint,
    permittedData,
    {
      properties: {
        ...blueprint.properties,
        ...validateBlueprintProperties(permittedData.properties),
      },
      updateMapping: {
        ...blueprint.updateMapping,
        ...permittedData.updateMapping,
      },
      relations: Object.values(relations),
    }
  );
  blueprint.updated = new Date();

  try {
    await blueprint.save();
    cacheManager.setItem(`blueprint:${req.headers.tenant}:${bluePrintIdentifier}`, JSON.stringify(blueprint)).catch()
    res.json(blueprint).end();
  } catch {
    res.status(400).json({ message: 'failed to update blueprint' }).end();
  }
}

export async function removeBlueprint(req, res) {
  const blueprintIdentifier = req.params.blueprintIdentifier.toString();
  try {
    const blueprint = await Blueprint.findOne({
      tenant: req.headers.tenant,
      identifier: blueprintIdentifier
    }).lean().exec()

    const existingEntities = await getEntityModel(blueprint).countDocuments({
      tenant: req.headers.tenant,
      blueprint: blueprintIdentifier
    }).lean().exec();

    if (existingEntities > 0) {
      res.status(400).json({ message: 'cannot remove blueprint with existing entities' }).end();
      return;
    }

    await Blueprint.deleteOne({
      tenant: req.headers.tenant,
      identifier: blueprintIdentifier
    }).exec()
    await evictBlueprintCache(req.headers.tenant, blueprintIdentifier);
    res.json(blueprint).end();
  } catch {
    res.status(500).json({ message: 'failed to remove blueprint' }).end();
  }
}
