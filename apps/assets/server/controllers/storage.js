const uniqid = require('uniqid');
const { dev } = require('../../config')
const Storage = require('../models/storage');
const { setSecret } = require('../services/secrets-management');

function getRelevantAuthenticationData(kind, payload = {}) {
  if (kind === 'ftp') {
    return {
      host: payload.host?.replace('ftp://', ''),
      username: payload.username,
      password: payload.password
    }
  }

  return payload;
}

async function createStorage(req, res) {
  const body = req.body || {};
  const storage = new Storage({
    tenant: req.headers.tenant,
    name: body.name,
    kind: body.kind,
    metadata: body.metadata,
    isDefault: body.isDefault,
    authentication: uniqid()
  });

  try {
    await setSecret(storage.tenant, storage.authentication, getRelevantAuthenticationData(storage.kind, body.authentication));
  } catch (e) {
    if (dev) {
      console.log(e);
    }
    res.status(400).json({
      message: 'storage creation failed',
      description: 'failed to encrypt authentication values'
    }).end();
    return;
  }

  storage.save()
    .then(({ _id, name, kind, metadata }) => {
      res.status(200).json({ _id, name, kind, metadata }).end();
    })
    .catch(() => {
      res.status(400).json({ message: 'storage creation failed' }).end();
    });
}

function getStorageList(req, res) {

  return Storage.find({ tenant: req.headers.tenant })
    .select('kind name metadata')
    .lean()
    .then(list => {
      if (!list) {
        return Promise.reject(null);
      }
      return res.status(200).jsonp(list).end();
    })
    .catch(() => res.status(400).json({ message: 'error loading storage list' }).end());
}

async function removeStorage(req, res) {
  try {
    await setSecret(req.storage.tenant, req.storage.authentication, null);
    await Storage.deleteOne({ _id: req.storage._id, tenant: req.headers.tenant });
    return res.status(200).json({}).end();
  } catch (error) {
    return res.status(400).json({ message: 'failed to remove storage' }).end();
  }
}

function updateStorage(req, res) {
  const body = req.body || {};
  let promise = Promise.resolve();
  if (body.name && body.name !== req.storage.name) {
    req.storage.name = body.name;
  }
  if ((body.kind && body.kind !== req.storage.kind) || body.authentication) {
    req.storage.kind = body.kind || req.storage.kind;
    promise = setSecret(req.storage.tenant, req.storage.authentication, getRelevantAuthenticationData(req.storage.kind, body.authentication));
  }
  if (body.isDefault !== req.storage.isDefault) {
    req.storage.isDefault = body.isDefault
  }
  if (body.metadata) {
    req.storage.metadata = body.metadata;
  }
  promise
    .then(() => req.storage.save())
    .then(() => res.status(200).json({
      name: req.storage.name,
      kind: req.storage.kind,
      isDefault: req.storage.isDefault,
      metadata: req.storage.metadata
    }).end())
    .catch(() => res.status(400).json({ message: 'failed to update storage' }).end());
}

function getStorageById(req, res, next) {
  return Storage.findOne({ _id: req.params.storageId, tenant: req.headers.tenant })
    .then(storage => {
      if (!storage) {
        throw new Error('storage not exists');
      }
      req.storage = storage;
      next();
    })
    .catch(() => res.status(404).json({ message: 'could not find storage' }).end());
}

function getStorage(req, res) {
  const { _id, name, kind, metadata, isDefault } = req.storage;
  res.status(200).json({ _id, name, kind, metadata, isDefault }).end();
}

module.exports = { createStorage, getStorageList, removeStorage, getStorageById, updateStorage, getStorage };
