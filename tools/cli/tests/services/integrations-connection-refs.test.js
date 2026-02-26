const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Import the functions we need to test
// Since the service uses ES modules, we need to use jiti to load it
const jiti = require('jiti')(__filename);
const integrationsService = jiti(path.join(__dirname, '../../services/resources/integrations.mjs'));

describe('Integration Connection Reference Mapping', () => {
  let testDir;
  let mockSdk;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-refs-test-'));
    
    // Mock SDK
    mockSdk = {
      callJsonApi: jest.fn()
    };
  });
  
  afterEach(() => {
    // Clean up test directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    // Clean up sibling connections directory
    const parentDir = path.dirname(testDir);
    const connectionsDir = path.join(parentDir, 'connections');
    if (fs.existsSync(connectionsDir)) {
      fs.rmSync(connectionsDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
  });

  describe('loadConnectionIdMap', () => {
    it('should load connection mappings from files', () => {
      // Create connections directory
      const parentDir = path.dirname(testDir);
      const connectionsDir = path.join(parentDir, 'connections');
      fs.mkdirSync(connectionsDir, { recursive: true });
      
      // Create test connection files
      const connection1 = { _id: 'conn1', name: 'Connection 1', kind: 'openai' };
      const connection2 = { _id: 'conn2', name: 'Connection 2', kind: 'anthropic' };
      
      fs.writeFileSync(
        path.join(connectionsDir, 'conn1.connection.json'),
        JSON.stringify(connection1)
      );
      fs.writeFileSync(
        path.join(connectionsDir, 'conn2.connection.json'),
        JSON.stringify(connection2)
      );
      
      // Call the function
      const connectionMap = integrationsService.loadConnectionIdMap(testDir);
      
      // Verify mappings
      expect(connectionMap.size).toBe(2);
      expect(connectionMap.get('conn1')).toBe('../connections/conn1.connection.json');
      expect(connectionMap.get('conn2')).toBe('../connections/conn2.connection.json');
    });
    
    it('should return empty map when connections directory does not exist', () => {
      const connectionMap = integrationsService.loadConnectionIdMap(testDir);
      expect(connectionMap.size).toBe(0);
    });
    
    it('should skip files without _id', () => {
      // Create connections directory
      const parentDir = path.dirname(testDir);
      const connectionsDir = path.join(parentDir, 'connections');
      fs.mkdirSync(connectionsDir, { recursive: true });
      
      // Create connection file without _id
      const connectionWithoutId = { name: 'No ID', kind: 'openai' };
      fs.writeFileSync(
        path.join(connectionsDir, 'no-id.connection.json'),
        JSON.stringify(connectionWithoutId)
      );
      
      const connectionMap = integrationsService.loadConnectionIdMap(testDir);
      expect(connectionMap.size).toBe(0);
    });
    
    it('should handle invalid JSON files gracefully', () => {
      // Create connections directory
      const parentDir = path.dirname(testDir);
      const connectionsDir = path.join(parentDir, 'connections');
      fs.mkdirSync(connectionsDir, { recursive: true });
      
      // Create valid connection
      const connection1 = { _id: 'conn1', name: 'Connection 1', kind: 'openai' };
      fs.writeFileSync(
        path.join(connectionsDir, 'conn1.connection.json'),
        JSON.stringify(connection1)
      );
      
      // Create invalid JSON file
      fs.writeFileSync(
        path.join(connectionsDir, 'invalid.connection.json'),
        'invalid json content'
      );
      
      const connectionMap = integrationsService.loadConnectionIdMap(testDir);
      expect(connectionMap.size).toBe(1);
      expect(connectionMap.get('conn1')).toBe('../connections/conn1.connection.json');
    });
  });

  describe('replaceConnectionIds', () => {
    it('should replace trigger.source and target.source with $refId objects', () => {
      const connectionMap = new Map([
        ['conn1', '../connections/openai.connection.json'],
        ['conn2', '../connections/anthropic.connection.json']
      ]);
      
      const integration = {
        _id: 'int1',
        trigger: {
          source: 'conn1',
          operation: 'chatCompletion'
        },
        target: {
          source: 'conn2',
          operation: 'chatCompletion'
        }
      };
      
      const result = integrationsService.replaceConnectionIds(integration, connectionMap);
      
      expect(result.trigger.source).toEqual({ $refId: '../connections/openai.connection.json' });
      expect(result.target.source).toEqual({ $refId: '../connections/anthropic.connection.json' });
    });
    
    it('should not replace sources that are not in the map', () => {
      const connectionMap = new Map([
        ['conn1', '../connections/openai.connection.json']
      ]);
      
      const integration = {
        _id: 'int1',
        trigger: {
          source: 'conn2', // Not in map
          operation: 'chatCompletion'
        },
        target: {
          source: 'conn1',
          operation: 'chatCompletion'
        }
      };
      
      const result = integrationsService.replaceConnectionIds(integration, connectionMap);
      
      expect(result.trigger.source).toBe('conn2'); // Unchanged
      expect(result.target.source).toEqual({ $refId: '../connections/openai.connection.json' });
    });
    
    it('should handle missing trigger or target', () => {
      const connectionMap = new Map([
        ['conn1', '../connections/openai.connection.json']
      ]);
      
      const integration1 = { _id: 'int1', target: { source: 'conn1' } };
      const result1 = integrationsService.replaceConnectionIds(integration1, connectionMap);
      expect(result1.target.source).toEqual({ $refId: '../connections/openai.connection.json' });
      
      const integration2 = { _id: 'int2', trigger: { source: 'conn1' } };
      const result2 = integrationsService.replaceConnectionIds(integration2, connectionMap);
      expect(result2.trigger.source).toEqual({ $refId: '../connections/openai.connection.json' });
    });
    
    it('should not modify the original integration object', () => {
      const connectionMap = new Map([
        ['conn1', '../connections/openai.connection.json']
      ]);
      
      const integration = {
        _id: 'int1',
        trigger: { source: 'conn1', operation: 'chatCompletion' }
      };
      
      const result = integrationsService.replaceConnectionIds(integration, connectionMap);
      
      // Original should be unchanged
      expect(integration.trigger.source).toBe('conn1');
      // Result should have the replacement
      expect(result.trigger.source).toEqual({ $refId: '../connections/openai.connection.json' });
    });
  });

  describe('resolveConnectionReferences', () => {
    beforeEach(() => {
      // Create connections directory as sibling to testDir (parent directory)
      const parentDir = path.dirname(testDir);
      const connectionsDir = path.join(parentDir, 'connections');
      fs.mkdirSync(connectionsDir, { recursive: true });
      
      // Create test connection files
      const connection1 = { _id: 'resolved-conn1', name: 'Connection 1', kind: 'openai' };
      const connection2 = { _id: 'resolved-conn2', name: 'Connection 2', kind: 'anthropic' };
      
      fs.writeFileSync(
        path.join(connectionsDir, 'conn1.connection.json'),
        JSON.stringify(connection1)
      );
      fs.writeFileSync(
        path.join(connectionsDir, 'conn2.connection.json'),
        JSON.stringify(connection2)
      );
    });
    
    it('should resolve $refId objects to actual connection IDs', () => {
      const integration = {
        _id: 'int1',
        trigger: {
          source: { $refId: '../connections/conn1.connection.json' },
          operation: 'chatCompletion'
        },
        target: {
          source: { $refId: '../connections/conn2.connection.json' },
          operation: 'chatCompletion'
        }
      };
      
      const result = integrationsService.resolveConnectionReferences(integration, testDir);
      
      expect(result.trigger.source).toBe('resolved-conn1');
      expect(result.target.source).toBe('resolved-conn2');
    });
    
    it('should throw error when referenced file does not exist', () => {
      const integration = {
        _id: 'int1',
        trigger: {
          source: { $refId: '../connections/nonexistent.connection.json' },
          operation: 'chatCompletion'
        }
      };
      
      expect(() => {
        integrationsService.resolveConnectionReferences(integration, testDir);
      }).toThrow('Connection file not found');
    });
    
    it('should throw error when connection file is missing _id', () => {
      // Create connection file without _id
      const parentDir = path.dirname(testDir);
      const connectionsDir = path.join(parentDir, 'connections');
      fs.writeFileSync(
        path.join(connectionsDir, 'no-id.connection.json'),
        JSON.stringify({ name: 'No ID', kind: 'openai' })
      );
      
      const integration = {
        _id: 'int1',
        trigger: {
          source: { $refId: '../connections/no-id.connection.json' },
          operation: 'chatCompletion'
        }
      };
      
      expect(() => {
        integrationsService.resolveConnectionReferences(integration, testDir);
      }).toThrow('Connection file missing _id field');
    });
    
    it('should handle invalid JSON in connection file', () => {
      // Create invalid JSON file
      const parentDir = path.dirname(testDir);
      const connectionsDir = path.join(parentDir, 'connections');
      fs.writeFileSync(
        path.join(connectionsDir, 'invalid.connection.json'),
        'invalid json content'
      );
      
      const integration = {
        _id: 'int1',
        trigger: {
          source: { $refId: '../connections/invalid.connection.json' },
          operation: 'chatCompletion'
        }
      };
      
      expect(() => {
        integrationsService.resolveConnectionReferences(integration, testDir);
      }).toThrow();
    });
    
    it('should not modify the original integration object', () => {
      const integration = {
        _id: 'int1',
        trigger: {
          source: { $refId: '../connections/conn1.connection.json' },
          operation: 'chatCompletion'
        }
      };
      
      const result = integrationsService.resolveConnectionReferences(integration, testDir);
      
      // Original should be unchanged
      expect(integration.trigger.source).toEqual({ $refId: '../connections/conn1.connection.json' });
      // Result should have the resolved ID
      expect(result.trigger.source).toBe('resolved-conn1');
    });
  });

  describe('Integration End-to-End', () => {
    beforeEach(() => {
      // Create connections directory
      const parentDir = path.dirname(testDir);
      const connectionsDir = path.join(parentDir, 'connections');
      fs.mkdirSync(connectionsDir, { recursive: true });
      
      // Create test connection files
      const connection1 = { _id: 'conn-123', name: 'OpenAI Connection', kind: 'openai' };
      const connection2 = { _id: 'conn-456', name: 'Anthropic Connection', kind: 'anthropic' };
      
      fs.writeFileSync(
        path.join(connectionsDir, 'openai.connection.json'),
        JSON.stringify(connection1)
      );
      fs.writeFileSync(
        path.join(connectionsDir, 'anthropic.connection.json'),
        JSON.stringify(connection2)
      );
    });
    
    it('should complete full pull and push cycle with connection references', async () => {
      // Mock API responses
      mockSdk.callJsonApi
        .mockResolvedValueOnce([
          {
            _id: 'int-789',
            kind: ['qelos', 'openai'],
            active: true,
            trigger: {
              source: 'conn-123',
              operation: 'chatCompletion',
              details: { name: 'Test Integration' }
            },
            target: {
              source: 'conn-456',
              operation: 'chatCompletion',
              details: { model: 'gpt-4' }
            },
            dataManipulation: []
          }
        ])
        .mockResolvedValueOnce({
          _id: 'int-789',
          kind: ['qelos', 'openai'],
          active: true,
          trigger: {
            source: 'conn-123',
            operation: 'chatCompletion',
            details: { name: 'Test Integration' }
          },
          target: {
            source: 'conn-456',
            operation: 'chatCompletion',
            details: { model: 'gpt-4' }
          },
          dataManipulation: []
        });
      
      // Pull integrations
      await integrationsService.pullIntegrations(mockSdk, testDir);
      
      // Verify pulled file has $refId references
      const integrationFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.integration.json'));
      expect(integrationFiles).toHaveLength(1);
      
      const pulledIntegration = JSON.parse(
        fs.readFileSync(path.join(testDir, integrationFiles[0]), 'utf-8')
      );
      expect(pulledIntegration.trigger.source).toEqual({ $refId: '../connections/openai.connection.json' });
      expect(pulledIntegration.target.source).toEqual({ $refId: '../connections/anthropic.connection.json' });
      
      // Push integrations back
      await integrationsService.pushIntegrations(mockSdk, testDir);
      
      // Verify the API was called with resolved IDs
      expect(mockSdk.callJsonApi).toHaveBeenCalledTimes(2);
      const pushCall = mockSdk.callJsonApi.mock.calls[1];
      const pushedPayload = JSON.parse(pushCall[1].body);
      
      expect(pushedPayload.trigger.source).toBe('conn-123');
      expect(pushedPayload.target.source).toBe('conn-456');
      
      // Verify the file was saved back with $refId references
      const updatedIntegration = JSON.parse(
        fs.readFileSync(path.join(testDir, integrationFiles[0]), 'utf-8')
      );
      expect(updatedIntegration.trigger.source).toEqual({ $refId: '../connections/openai.connection.json' });
      expect(updatedIntegration.target.source).toEqual({ $refId: '../connections/anthropic.connection.json' });
    });
    
    it('should handle integrations without connection references', async () => {
      mockSdk.callJsonApi.mockResolvedValueOnce([
        {
          _id: 'int-simple',
          kind: ['qelos'],
          active: true,
          trigger: {
            source: 'direct-source',
            operation: 'webhook',
            details: {}
          },
          target: {
            source: 'direct-target',
            operation: 'webhook',
            details: {}
          },
          dataManipulation: []
        }
      ]);
      
      // Pull integrations
      await integrationsService.pullIntegrations(mockSdk, testDir);
      
      // Verify pulled file
      const integrationFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.integration.json'));
      const pulledIntegration = JSON.parse(
        fs.readFileSync(path.join(testDir, integrationFiles[0]), 'utf-8')
      );
      
      // Sources should remain unchanged (not connection IDs)
      expect(pulledIntegration.trigger.source).toBe('direct-source');
      expect(pulledIntegration.target.source).toBe('direct-target');
    });
  });
});
