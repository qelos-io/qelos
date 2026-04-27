import { logger } from '../services/utils/logger.mjs';
import { initializeSdk } from '../services/config/sdk.mjs';
import { green, blue } from '../services/utils/logger.mjs';

export default async function generateProxyController({ pathFrom, endpointTo, token }) {
  try {
    logger.section(`Generating proxy plugin: ${pathFrom} -> ${endpointTo}`);

    // Initialize SDK
    const sdk = await initializeSdk();

    // Generate plugin name from pathFrom
    const pluginName = pathFrom.replace(/\//g, '-');

    // Get token from command line or environment variable
    const resolvedToken = token !== undefined ? token : process.env.QELOS_PROXY_TOKEN;

    // Check if plugin already exists
    logger.info('Checking for existing plugin...');
    const existingPlugins = await sdk.managePlugins.getList();
    const existingPlugin = existingPlugins.find(p => p.name === pluginName);

    let pluginData;
    if (existingPlugin) {
      logger.info(`Found existing plugin: ${existingPlugin.name}`);
      
      // Update existing plugin
      const updateData = {
        apiPath: pathFrom,
        proxyUrl: endpointTo,
      };

      // Update token if provided (either via command line or env)
      if (token !== undefined || process.env.QELOS_PROXY_TOKEN !== undefined) {
        updateData.token = resolvedToken;
      }

      pluginData = await sdk.managePlugins.update(existingPlugin._id, updateData);
      logger.success(`Updated existing plugin configuration`);
    } else {
      // Create new plugin
      const createData = {
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
        createData.token = resolvedToken;
      }

      pluginData = await sdk.managePlugins.create(createData);
      logger.success(`Created new plugin configuration`);
    }

    // Print the expected proxy route
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Proxy plugin generated successfully!');
    console.log('='.repeat(60));
    console.log(`\n${green('Proxy route:')}`);
    console.log(`  from ${blue('/api/' + pathFrom)} to ${blue(endpointTo)}`);
    
    if (pluginData.token !== undefined) {
      console.log(`\n${green('Authentication:')}`);
      console.log(`  Token: ${pluginData.token ? '[SET]' : '[NOT SET]'}`);
      if (token !== undefined) {
        console.log(`    (from command line)`);
      } else if (process.env.QELOS_PROXY_TOKEN !== undefined) {
        console.log(`    (from environment variable QELOS_PROXY_TOKEN)`);
      }
    }

    console.log(`\n${green('Plugin details:')}`);
    console.log(`  ID: ${pluginData._id}`);
    console.log(`  Name: ${pluginData.name}`);
    console.log(`  API Path: ${pluginData.apiPath}`);
    console.log(`  Proxy URL: ${pluginData.proxyUrl}`);
    
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    logger.error(`Failed to generate proxy plugin`, error);
    process.exit(1);
  }
}
