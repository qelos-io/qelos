const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

describe('Push Command - Hard Flag Behavior', () => {
  let testDir;
  let originalCwd;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-hard-behavior-test-'));
    originalCwd = process.cwd();
    
    // Create resource directories
    fs.mkdirSync(path.join(testDir, 'components'));
    fs.mkdirSync(path.join(testDir, 'blueprints'));
    fs.mkdirSync(path.join(testDir, 'plugins'));
    fs.mkdirSync(path.join(testDir, 'integrations'));
  });
  
  afterEach(() => {
    // Clean up test directory
    process.chdir(originalCwd);
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const runHardPushScript = (script) => {
    const scriptFile = path.join(testDir, 'test-hard-push.mjs');
    fs.writeFileSync(scriptFile, script);
    
    try {
      const output = execSync(`node ${scriptFile}`, { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return { success: true, output };
    } catch (error) {
      return { 
        success: false, 
        output: error.stderr || error.stdout || error.message
      };
    }
  };

  describe('Helper functions behavior', () => {
    it('should filter local files correctly by type', () => {
      // Create test files
      fs.writeFileSync(path.join(testDir, 'test.vue'), '<template>test</template>');
      fs.writeFileSync(path.join(testDir, 'test.blueprint.json'), '{}');
      fs.writeFileSync(path.join(testDir, 'test.plugin.json'), '{}');
      fs.writeFileSync(path.join(testDir, 'test.integration.json'), '{}');
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'text');
      
      const script = `
        import fs from 'node:fs';
        import path from 'node:path';
        
        function getLocalFiles(typePath, type) {
          if (!fs.existsSync(typePath)) return [];
          
          const files = fs.readdirSync(typePath);
          return files.filter(file => {
            if (type === 'components') return file.endsWith('.vue');
            if (type === 'blueprints') return file.endsWith('.blueprint.json');
            if (type === 'plugins') return file.endsWith('.plugin.json');
            if (type === 'integrations') return file.endsWith('.integration.json');
            return false;
          });
        }
        
        const components = getLocalFiles('${testDir}', 'components');
        const blueprints = getLocalFiles('${testDir}', 'blueprints');
        const plugins = getLocalFiles('${testDir}', 'plugins');
        const integrations = getLocalFiles('${testDir}', 'integrations');
        
        console.log('components:', components.length);
        console.log('blueprints:', blueprints.length);
        console.log('plugins:', plugins.length);
        console.log('integrations:', integrations.length);
      `;
      
      const result = runHardPushScript(script);
      expect(result.success).toBe(true);
      expect(result.output).toContain('components: 1');
      expect(result.output).toContain('blueprints: 1');
      expect(result.output).toContain('plugins: 1');
      expect(result.output).toContain('integrations: 1');
    });

    it('should extract identifiers from filenames correctly', () => {
      const script = `
        function getIdentifierFromFile(filename, type) {
          if (type === 'components') {
            return filename.replace('.vue', '');
          }
          if (type === 'blueprints') {
            return filename.replace('.blueprint.json', '');
          }
          if (type === 'plugins') {
            return filename.replace('.plugin.json', '');
          }
          if (type === 'integrations') {
            return filename.replace('.integration.json', '');
          }
          return filename;
        }
        
        const compId = getIdentifierFromFile('my-component.vue', 'components');
        const bpId = getIdentifierFromFile('my-bp.blueprint.json', 'blueprints');
        const pluginId = getIdentifierFromFile('my-plugin.plugin.json', 'plugins');
        const intId = getIdentifierFromFile('my-int.integration.json', 'integrations');
        
        console.log('component-id:', compId);
        console.log('blueprint-id:', bpId);
        console.log('plugin-id:', pluginId);
        console.log('integration-id:', intId);
      `;
      
      const result = runHardPushScript(script);
      expect(result.success).toBe(true);
      expect(result.output).toContain('component-id: my-component');
      expect(result.output).toContain('blueprint-id: my-bp');
      expect(result.output).toContain('plugin-id: my-plugin');
      expect(result.output).toContain('integration-id: my-int');
    });
  });

  describe('Hard push workflow simulation', () => {
    it('should simulate the workflow of finding resources to remove', () => {
      // Create local files
      fs.writeFileSync(path.join(testDir, 'components', 'local-comp.vue'), '<template>Local</template>');
      fs.writeFileSync(path.join(testDir, 'blueprints', 'local-bp.blueprint.json'), JSON.stringify({ identifier: 'local-bp' }));
      
      const script = `
        import fs from 'node:fs';
        import path from 'node:path';
        
        function getLocalFiles(typePath, type) {
          if (!fs.existsSync(typePath)) return [];
          const files = fs.readdirSync(typePath);
          return files.filter(file => {
            if (type === 'components') return file.endsWith('.vue');
            if (type === 'blueprints') return file.endsWith('.blueprint.json');
            return false;
          });
        }
        
        function getIdentifierFromFile(filename, type) {
          if (type === 'components') return filename.replace('.vue', '');
          if (type === 'blueprints') return filename.replace('.blueprint.json', '');
          return filename;
        }
        
        // Simulate remote resources
        const remoteComponents = ['local-comp', 'remote-comp-1', 'remote-comp-2'];
        const remoteBlueprints = ['local-bp', 'remote-bp-1'];
        
        // Get local files
        const localComponentFiles = getLocalFiles(path.join('${testDir}', 'components'), 'components');
        const localBlueprintFiles = getLocalFiles(path.join('${testDir}', 'blueprints'), 'blueprints');
        
        const localComponentIds = localComponentFiles.map(f => getIdentifierFromFile(f, 'components'));
        const localBlueprintIds = localBlueprintFiles.map(f => getIdentifierFromFile(f, 'blueprints'));
        
        // Find resources to remove
        const toRemoveComponents = remoteComponents.filter(id => !localComponentIds.includes(id));
        const toRemoveBlueprints = remoteBlueprints.filter(id => !localBlueprintIds.includes(id));
        
        console.log('to-remove-components:', toRemoveComponents.length);
        console.log('to-remove-blueprints:', toRemoveBlueprints.length);
        console.log('components-to-remove:', toRemoveComponents.join(','));
        console.log('blueprints-to-remove:', toRemoveBlueprints.join(','));
      `;
      
      const result = runHardPushScript(script);
      expect(result.success).toBe(true);
      expect(result.output).toContain('to-remove-components: 2');
      expect(result.output).toContain('to-remove-blueprints: 1');
      expect(result.output).toContain('components-to-remove: remote-comp-1,remote-comp-2');
      expect(result.output).toContain('blueprints-to-remove: remote-bp-1');
    });
  });
});
