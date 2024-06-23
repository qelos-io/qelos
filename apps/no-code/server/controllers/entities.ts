import qs from 'qs'
import { v4 as uuidv4 } from 'uuid';
import BlueprintEntity from '../models/blueprint-entity';
import { IBlueprint } from '../models/blueprint';
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { PermissionScope } from '@qelos/global-types';
import mongoose from 'mongoose';
import logger from '../services/logger';

type Full<T> = {
  [P in keyof T]-?: T[P];
}

function getEntityQuery({ entityIdentifier, blueprint, req }: {
  entityIdentifier?: string,
  blueprint: IBlueprint,
  req: Full<RequestWithUser>
}) {
  const query: any = {
    tenant: req.headers.tenant,
    blueprint: blueprint.identifier,
  };
  if (entityIdentifier) {
    query.identifier = entityIdentifier;
  }
  if (blueprint.permissionScope === PermissionScope.USER) {
    query.user = req.user._id
  } else if (blueprint.permissionScope === PermissionScope.WORKSPACE) {
    query.workspace = req.workspace._id
  }
  return query;
}

export async function getAllBlueprintEntities(req, res) {
  const blueprint = req.blueprint;
  try {
    if (!blueprint) {
      res.status(404).json({ message: 'blueprint not found' }).end();
      return;
    }
    const entities = await BlueprintEntity.find({
      ...qs.parse(req.url, { depth: 3 }),
      ...getEntityQuery({ blueprint, req })
    })
      .lean()
      .exec()

    res.json(entities).end();
  } catch {
    res.status(500).json({ message: 'something went wrong with entities' }).end();
  }
}

export async function getSingleBlueprintEntity(req, res) {
  const entityIdentifier = req.params.entityIdentifier;
  const blueprint: IBlueprint = req.blueprint;
  const query: any = {
    tenant: req.headers.tenant,
    blueprint: blueprint.identifier,
    identifier: entityIdentifier,
  };
  if (blueprint.permissionScope === PermissionScope.USER) {
    query.user = req.user._id
  } else if (blueprint.permissionScope === PermissionScope.WORKSPACE) {
    query.workspace = req.workspace._id
  }
  try {
    const entity = await BlueprintEntity.findOne(query)
      .lean()
      .exec()

    if (!entity) {
      res.status(404).json({ message: 'entity not found' }).end();
      return;
    }
    res.json(entity).end();
  } catch {
    res.status(500).json({ message: 'something went wrong with entity' }).end();
  }
}

export async function createBlueprintEntity(req, res) {
  const blueprint: IBlueprint = req.blueprint;
  const body = req.body || {}
  try {
    const entity = new BlueprintEntity({
      tenant: req.headers.tenant,
      blueprint: blueprint.identifier,
      identifier: blueprint.entityIdentifierMechanism === 'objectid' ? new mongoose.Types.ObjectId() : uuidv4(),
      user: req.user._id,
      workspace: req.workspace?._id,
      title: body.title,
      metadata: body.metadata || {},
    });

    // run the update mapping pre-save

    // validate the metadata

    // validate the relations

    await entity.save();
    return entity;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'something went wrong with entity creation' }).end();
  }
}

export async function updateBlueprintEntity(req, res) {

}

export async function removeBlueprintEntity(req, res) {

}