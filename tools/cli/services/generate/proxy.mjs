import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../utils/logger.mjs';

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    logger.success(`Created directory: ${dirPath}`);
  }
}

async function findExistingPlugin(pluginsDir, pluginName) {
  try {
    const filePath = path.join(pluginsDir, `${pluginName}.plugin.json`);
    await fs.access(filePath);
    const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return { filePath, content };
  } catch {
    return null;
  }
}

export async function generateProxy(pathFrom, endpointTo, token, cwd) {
  try {
    // Ensure plugins directory exists
    const pluginsDir = path.join(cwd, 'plugins');
    await ensureDirectoryExists(pluginsDir);
    
    // Generate plugin name from pathFrom
    const pluginName = pathFrom.replace(/\//g, '-');
    const pluginFileName = `${pluginName}.plugin.json`;
    const pluginFilePath = path.join(pluginsDir, pluginFileName);
    
    // Get token from command line or environment variable
    const resolvedToken = token !== undefined ? token : process.env.QELOS_PROXY_TOKEN;
    
    // Check if plugin already exists
    const existingPlugin = await findExistingPlugin(pluginsDir, pluginName);
    
    let pluginData;
    if (existingPlugin) {
      logger.info(`Found existing plugin: ${pluginFileName}`);
      
      // Update existing plugin
      pluginData = existingPlugin.content;
      pluginData.apiPath = pathFrom;
      pluginData.proxyUrl = endpointTo;
      
      // Update token if provided (either via command line or env)
      if (token !== undefined || process.env.QELOS_PROXY_TOKEN !== undefined) {
        pluginData.token = resolvedToken;
      }
      
      logger.success(`Updated existing plugin configuration`);
    } else {
      // Create new plugin
      pluginData = {
        name: pluginName,
        description: `${pathFrom} api`,
        manifestUrl: "",
        apiPath: pathFrom,
        authAcquire: {
          refreshTokenKey: "refresh_token",
          accessTokenKey: "access_token"
        },
        proxyUrl: endpointTo,
        subscribedEvents: [],
        microFrontends: [],
        injectables: [],
        navBarGroups: [],
        cruds: []
      };
      
      // Add token if provided (either via command line or env)
      if (token !== undefined || process.env.QELOS_PROXY_TOKEN !== undefined) {
        pluginData.token = resolvedToken;
      }
      
      logger.success(`Created new plugin configuration`);
    }
    
    // Write plugin file
    await fs.writeFile(pluginFilePath, JSON.stringify(pluginData, null, 2));
    logger.success(`Generated proxy plugin: ${pluginFilePath}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Proxy plugin generated successfully!');
    console.log('='.repeat(60));
    console.log(`\nPlugin details:`);
    console.log(`  Name: ${pluginData.name}`);
    console.log(`  API Path: ${pluginData.apiPath}`);
    console.log(`  Proxy URL: ${pluginData.proxyUrl}`);
    if (pluginData.token !== undefined) {
      console.log(`  Token: ${pluginData.token ? '[SET]' : '[NOT SET]'}`);
      if (token !== undefined) {
        console.log(`    (from command line)`);
      } else if (process.env.QELOS_PROXY_TOKEN !== undefined) {
        console.log(`    (from environment variable QELOS_PROXY_TOKEN)`);
      }
    }
    console.log(`\nTo push the plugin to Qelos, run:`);
    console.log(`  qelos push plugins ./plugins/${pluginFileName}`);
    console.log('\n' + '='.repeat(60));
    
    return { success: true };
    
  } catch (error) {
    throw error;
  }
}
