import * as nodeTest from 'node:test';
import * as assert from 'node:assert';
import { request } from 'undici';
import QelosSDK from '@qelos/sdk';
import QelosAdminSDK from '@qelos/sdk/dist/administrator';
import crypto from 'node:crypto';

import { startServer, stopServer } from './utils/processManager';

let sdk: QelosSDK;
let sdkAdmin: QelosAdminSDK;
let uniquePluginName: string;
let uniquePluginApiPath: string;
let originalPluginApiPathFromManifest: string; // To store the original apiPath from manifest before overriding
let qelosUrl: string;
let createdPluginIdForCleanup: string | null = null;

const API_PLUGIN_PORT = Number(process.env.PORT || '2040');
const API_PLUGIN_URL = `http://127.0.0.1:${API_PLUGIN_PORT}`;

nodeTest.describe('Plugin Play API Plugin E2E Tests', { timeout: 45000 }, () => {
  nodeTest.before(async () => { 
    
    try {
      qelosUrl = process.env.QELOS_URL || 'http://localhost:3000';
      const qelosEmail = process.env.QELOS_USER || 'test@test.com';
      const qelosPassword = process.env.QELOS_PASSWORD || 'admin';

      if (!qelosUrl || !qelosEmail || !qelosPassword) {
        throw new Error('Missing QELOS_URL, QELOS_USER, or QELOS_PASSWORD environment variables');
      }

      const randomSuffix = crypto.randomBytes(4).toString('hex');
      uniquePluginName = `api-demo-e2e-${randomSuffix}`;
      uniquePluginApiPath = `api-demo-path-e2e-${randomSuffix}`;

      await startServer(API_PLUGIN_PORT, { PLUGIN_NAME: uniquePluginName, API_PATH: uniquePluginApiPath });


      sdk = new QelosSDK({ appUrl: qelosUrl, fetch: globalThis.fetch });
      sdkAdmin = new QelosAdminSDK({ appUrl: qelosUrl, fetch: globalThis.fetch });
      await sdk.authentication.oAuthSignin({ username: qelosEmail, password: qelosPassword });
      await sdkAdmin.authentication.oAuthSignin({ username: qelosEmail, password: qelosPassword });
    const loggedInAdmin = await sdkAdmin.authentication.getLoggedInUser();


      const plugins = await sdkAdmin.managePlugins.getList();
      

      if (sdkAdmin && typeof sdkAdmin.managePlugins?.remove === 'function') {
        const existingPlugins = await sdkAdmin.managePlugins.getList();
        const pluginToRemove = existingPlugins.find(p => p.apiPath === uniquePluginApiPath);
        if (pluginToRemove && pluginToRemove._id) {
          try {
            await sdkAdmin.managePlugins.remove(pluginToRemove._id);
          } catch (error: any) {
            if (error.statusCode !== 404 && error.status !== 404 && !error.message?.includes('not found')) {
            }
          }
        } else {

        }
      } else {

      }
    } catch (err) {
      throw err; 
    }
  }, { timeout: 60000 });

  nodeTest.it('should register the plugin successfully', async () => {
    assert.ok(sdkAdmin, 'Admin SDK should be initialized');
    assert.ok(uniquePluginName, 'uniquePluginName should be set');
    assert.ok(uniquePluginApiPath, 'uniquePluginApiPath should be set');

    const manifestResponse = await fetch(`${API_PLUGIN_URL}/api/play-manifest`);
    assert.ok(manifestResponse.ok, `Manifest fetch failed: ${manifestResponse.status}`);
    const manifest = await manifestResponse.json();
    originalPluginApiPathFromManifest = manifest.apiPath; 
    assert.strictEqual(manifest.name, uniquePluginName, 'Manifest name should match unique name from env var');
    assert.strictEqual(manifest.apiPath, uniquePluginApiPath, 'Manifest apiPath should match unique apiPath from env var');

    const pluginRegistrationPayload = {
      name: uniquePluginName,
      appUrl: API_PLUGIN_URL,
      apiPath: uniquePluginApiPath,
      manifestUrl: `${API_PLUGIN_URL}/api/play-manifest`,
    };


    try {
      const createdPlugin = await sdkAdmin.managePlugins.create(pluginRegistrationPayload as any);

      
      assert.ok(createdPlugin, 'Plugin creation did not return an object.');
      assert.ok(createdPlugin._id, 'Created plugin does not have an _id.');
      assert.strictEqual(createdPlugin.apiPath, uniquePluginApiPath, 'Created plugin apiPath does not match expected.');
      assert.strictEqual(createdPlugin.name, uniquePluginName, 'Created plugin name does not match expected.');
      
      createdPluginIdForCleanup = createdPlugin._id;
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      throw error;
    }
  });

  nodeTest.after(async () => {
    if (sdkAdmin && createdPluginIdForCleanup && typeof sdkAdmin.managePlugins?.remove === 'function') {
      try {
        await sdkAdmin.managePlugins.remove(createdPluginIdForCleanup);
      } catch (error: any) {

      }
    } else {
      if (!createdPluginIdForCleanup) {
      }

    }

    await stopServer();
  }, { timeout: 30000 }); 

  nodeTest.it('should respond to a basic request', async () => {

    let httpResponse;
    try {
      // Using 'request' from 'undici' which is imported at the top of the file.
      // Fetches the root of the API plugin. Adjust the path as needed.
      httpResponse = await request(`${API_PLUGIN_URL}/`); 
    } catch (error: any) {
      console.error(`[E2E Test] Failed to fetch from server: ${error.message}`);
      // If fetch itself fails (e.g. server not reachable), rethrow to fail the test.
      throw new Error(`Connection to server ${API_PLUGIN_URL} failed: ${error.message}`);
    }

    // Using 'assert' from 'node:assert' which is imported at the top of the file.
    assert.ok(httpResponse, 'HTTP Response from server should be defined');
    
    // undici's response object uses 'statusCode', not 'status'.
    console.log(`[E2E Test] Received status ${httpResponse.statusCode} from ${API_PLUGIN_URL}/`);

    // Assert that statusCode is a number (basic check that we got a valid HTTP response object)
    assert.ok(typeof httpResponse.statusCode === 'number', 'Status code should be a number.');


  });


  nodeTest.it('should expose a manifest at /api/play-manifest', async () => {
    let httpResponse;
    const manifestUrl = `${API_PLUGIN_URL}/api/play-manifest`;
    try {
      httpResponse = await request(manifestUrl);
    } catch (error: any) {
      console.error(`[E2E Test] Failed to fetch manifest from ${manifestUrl}: ${error.message}`);
      throw new Error(`Connection to server for manifest failed: ${error.message}`);
    }

    assert.ok(httpResponse, 'HTTP Response for manifest should be defined');
    assert.strictEqual(httpResponse.statusCode, 200, `Expected status code 200 for manifest, got ${httpResponse.statusCode}`);

    const contentType = httpResponse.headers['content-type'];
    assert.ok(contentType?.includes('application/json'), `Expected content-type application/json, got ${contentType}`);

    const manifest = await httpResponse.body.json();

    // assert.deepStrictEqual(manifest, {}, 'Manifest body should be parsable JSON');
    
    // Values from the monorepo's package.json (due to cwd of server process)
    assert.strictEqual(manifest.name, uniquePluginName, 'Manifest name should match unique name');
    assert.strictEqual(manifest.apiPath, uniquePluginApiPath, 'Manifest apiPath should match unique path');

    // Values from server.ts override
    assert.strictEqual(manifest.description, 'api plugin for qelos', 'Manifest description');
    assert.strictEqual(manifest.appUrl, API_PLUGIN_URL, 'Manifest appUrl');
    
    // Default values from plugin-play
    assert.strictEqual(manifest.manifestUrl, '/api/play-manifest', 'Manifest manifestUrl property should be correct');
    // Add other checks for default properties if necessary, e.g., registerUrl, callbackUrl etc.
  });

  nodeTest.it('GET /example should return a random number via SDK proxy', async () => {
    assert.ok(sdk, 'SDK should be initialized');
    assert.ok(uniquePluginApiPath, 'uniquePluginApiPath should be set');
    const body = await sdk.callJsonApi(`/api/on/${uniquePluginApiPath}/example`);
    assert.ok(body && typeof body.yo === 'number', 'Expected body to have a "yo" property with a number');
    assert.ok(body.yo >= 0 && body.yo < 1, 'Expected "yo" to be between 0 and 1');
  });

  nodeTest.it('GET /tenant-payload should return the tenant payload via SDK proxy', async () => {
    assert.ok(sdk, 'SDK should be initialized');
    assert.ok(uniquePluginApiPath, 'uniquePluginApiPath should be set');
    const body = await sdk.callJsonApi(`/api/on/${uniquePluginApiPath}/tenant-payload`);
    assert.ok(body, 'Expected tenantPayload to be truthy');
    assert.ok(body.sub && typeof body.sub === 'string', 'Expected tenantPayload.sub to be a non-empty string');
    assert.ok(body.identifier && typeof body.identifier === 'string', 'Expected tenantPayload.identifier to be a non-empty string');
  });

  nodeTest.it('GET /req-user should return the request user object via SDK proxy', async () => {
    assert.ok(sdk, 'SDK should be initialized');
    assert.ok(uniquePluginApiPath, 'uniquePluginApiPath should be set');
    const body = await sdk.callJsonApi(`/api/on/${uniquePluginApiPath}/req-user`);
    assert.ok(body, 'Expected user object to be truthy');
    assert.strictEqual(body.username, 'test@test.com', 'Expected user username to be test@test.com');
    assert.ok(body._id && typeof body._id === 'string', 'Expected user._id to be a non-empty string');
    assert.ok(body.roles && Array.isArray(body.roles), 'Expected user.roles to be an array');
  });

  nodeTest.it('GET /plugin-sdk should return user profile from default SDK via SDK proxy', async () => {
    assert.ok(sdk, 'SDK should be initialized');
    assert.ok(uniquePluginApiPath, 'uniquePluginApiPath should be set');
    const body = await sdk.callJsonApi(`/api/on/${uniquePluginApiPath}/plugin-sdk`);
    assert.ok(body, 'Expected user profile from plugin SDK to be truthy');
    assert.strictEqual(body.username, 'test@test.com', 'Expected user profile email to be test@test.com');
    assert.ok(body._id && typeof body._id === 'string', 'Expected user profile id to be a non-empty string');
  });

  nodeTest.it('GET /tenant-sdk should return user profile from tenant-specific SDK via SDK proxy', async () => {
    assert.ok(sdk, 'SDK should be initialized');
    assert.ok(uniquePluginApiPath, 'uniquePluginApiPath should be set');
    const body = await sdk.callJsonApi(`/api/on/${uniquePluginApiPath}/tenant-sdk`);
    assert.ok(body, 'Expected user profile from tenant SDK to be truthy');
    assert.strictEqual(body.username.split('@')[1], 'localhost:3000', 'Expected user profile email domain to be localhost:3000');
    assert.ok(body._id && typeof body._id === 'string', 'Expected user profile id to be a non-empty string');
  });

  nodeTest.it('GET /workspace should return the user workspace object via SDK proxy', async () => {
    assert.ok(sdk, 'SDK should be initialized');
    assert.ok(uniquePluginApiPath, 'uniquePluginApiPath should be set');
    const body = await sdk.callJsonApi(`/api/on/${uniquePluginApiPath}/workspace`);
    assert.ok(body, 'Expected workspace object to be truthy');
    assert.ok(body._id && typeof body._id === 'string', 'Expected workspace._id to be a non-empty string');
    assert.ok(body.name && typeof body.name === 'string', 'Expected workspace.name to be a non-empty string');
  });

});
