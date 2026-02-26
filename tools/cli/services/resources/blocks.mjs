import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from '../utils/logger.mjs';

/**
 * Convert string to kebab-case
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Push blocks from local directory to remote
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} path - Path to blocks directory
 */
export async function pushBlocks(sdk, path, options = {}) {
  const { targetFile } = options;
  const directoryFiles = fs.readdirSync(path);
  const files = targetFile ? [targetFile] : directoryFiles;
  const blockFiles = files.filter(f => f.endsWith('.html'));
  
  if (blockFiles.length === 0) {
    if (targetFile) {
      logger.warning(`File ${targetFile} is not an .html block. Skipping.`);
    } else {
      logger.warning(`No .html files found in ${path}`);
    }
    return;
  }
  
  logger.info(`Found ${blockFiles.length} block(s) to push`);
  let blocksJson = {};
  
  try {
    const jsonPath = join(path, 'blocks.json');
    if (fs.existsSync(jsonPath)) {
      blocksJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }
  } catch (error) {
    logger.debug('No blocks.json found or invalid format');
  }
  
  const existingBlocks = await sdk.blocks.getList();
  const updatedBlocksJson = { ...blocksJson };
  
  await Promise.all(blockFiles.map(async (file) => {
    const fileName = file.replace('.html', '');
    const info = blocksJson[fileName] || {};
    const content = fs.readFileSync(join(path, file), 'utf-8');
    
    logger.step(`Pushing block: ${fileName}`);
    
    // First check if we have an _id in blocks.json
    let blockId = info._id;
    
    // If we have an _id, try to update directly
    if (blockId) {
      try {
        await sdk.blocks.update(blockId, {
          name: info.name || fileName,
          content,
          contentType: info.contentType || 'html',
          description: info.description || 'Block description'
        });
        logger.success(`Updated: ${fileName}`);
        return;
      } catch (error) {
        // If update fails, the block might have been deleted, so we'll create a new one
        logger.debug(`Block ${fileName} not found by _id, will search or create`);
      }
    }
    
    // Try to find existing block by name
    const existingBlock = existingBlocks.find(
      block => toKebabCase(block.name) === fileName
    );
    
    if (existingBlock) {
      await sdk.blocks.update(existingBlock._id, {
        name: info.name || existingBlock.name,
        content,
        contentType: info.contentType || 'html',
        description: info.description || existingBlock.description || 'Block description'
      });
      updatedBlocksJson[fileName] = {
        ...info,
        _id: existingBlock._id
      };
      logger.success(`Updated: ${fileName}`);
    } else {
      const newBlock = await sdk.blocks.create({
        name: info.name || fileName,
        content,
        contentType: info.contentType || 'html',
        description: info.description || 'Block description'
      });
      updatedBlocksJson[fileName] = {
        ...info,
        _id: newBlock._id,
        name: newBlock.name
      };
      logger.success(`Created: ${fileName}`);
    }
  }));
  
  // Update blocks.json with new _ids
  fs.writeFileSync(
    join(path, 'blocks.json'),
    JSON.stringify(updatedBlocksJson, null, 2)
  );
  
  logger.info(`Pushed ${blockFiles.length} block(s)`);
}

/**
 * Pull blocks from remote to local directory
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} targetPath - Path to save blocks
 */
export async function pullBlocks(sdk, targetPath) {
  // Create directory if it doesn't exist
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    logger.info(`Created directory: ${targetPath}`);
  }

  const blocks = await sdk.blocks.getList();
  
  if (blocks.length === 0) {
    logger.warning('No blocks found to pull');
    return;
  }
  
  logger.info(`Found ${blocks.length} block(s) to pull`);

  const blocksInformation = await Promise.all(blocks.map(async (block) => {
    const fileName = toKebabCase(block.name);
    const filePath = join(targetPath, `${fileName}.html`);

    const blockDetails = await sdk.blocks.getBlock(block._id);
    
    fs.writeFileSync(filePath, blockDetails.content, 'utf-8');
    logger.step(`Pulled: ${block.name}`);

    return {
      _id: block._id,
      name: block.name,
      description: blockDetails.description,
      contentType: blockDetails.contentType,
    };
  }));

  fs.writeFileSync(
    join(targetPath, 'blocks.json'),
    JSON.stringify(
      blocksInformation.reduce((obj, current) => {
        const fileName = toKebabCase(current.name);
        obj[fileName] = current;
        return obj;
      }, {}),
      null,
      2
    )
  );

  logger.info(`Saved blocks.json with metadata`);
  logger.info(`Pulled ${blocks.length} block(s)`);
}
