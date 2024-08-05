const ASSET_TYPES = require('../utils/asset-types.json');
const { isImage } = require('./url');

function getAssetType(metadata) {

  if (isImage(metadata.name)) {
    return ASSET_TYPES.IMAGE;
  }

  if (metadata.kind !== ASSET_TYPES.DIRECTORY) {
    return ASSET_TYPES.ASSET;
  }

  return ASSET_TYPES.DIRECTORY;
};

module.exports = { getAssetType };
