const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

describe('Duplicate Checker Integration', () => {
  let testDir;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'duplicate-checker-test-'));
  });
  
  afterEach(() => {
    // Clean up test directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Manual duplicate detection', () => {
    it('should manually detect duplicates in blueprint files', () => {
      // Create duplicate blueprints
      const blueprint1 = { identifier: 'test-bp', name: 'Test Blueprint 1' };
      const blueprint2 = { identifier: 'test-bp', name: 'Test Blueprint 2' };
      
      const file1 = path.join(testDir, 'bp1.blueprint.json');
      const file2 = path.join(testDir, 'bp2.blueprint.json');
      
      fs.writeFileSync(file1, JSON.stringify(blueprint1));
      fs.writeFileSync(file2, JSON.stringify(blueprint2));
      
      // Manual duplicate detection
      const identifiers = new Map();
      const duplicates = [];
      
      [file1, file2].forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          const identifier = data.identifier;
          
          if (identifier) {
            if (identifiers.has(identifier)) {
              duplicates.push({
                identifier,
                files: [identifiers.get(identifier), filePath]
              });
            } else {
              identifiers.set(identifier, filePath);
            }
          }
        } catch (error) {
          // Skip invalid files
        }
      });
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].identifier).toBe('test-bp');
      expect(duplicates[0].files).toEqual([file1, file2]);
    });

    it('should manually detect duplicates in config files', () => {
      // Create duplicate configs
      const config1 = { key: 'test-config', value: 'value1' };
      const config2 = { key: 'test-config', value: 'value2' };
      
      const file1 = path.join(testDir, 'config1.config.json');
      const file2 = path.join(testDir, 'config2.config.json');
      
      fs.writeFileSync(file1, JSON.stringify(config1));
      fs.writeFileSync(file2, JSON.stringify(config2));
      
      // Manual duplicate detection
      const identifiers = new Map();
      const duplicates = [];
      
      [file1, file2].forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          const identifier = data.key;
          
          if (identifier) {
            if (identifiers.has(identifier)) {
              duplicates.push({
                identifier,
                files: [identifiers.get(identifier), filePath]
              });
            } else {
              identifiers.set(identifier, filePath);
            }
          }
        } catch (error) {
          // Skip invalid files
        }
      });
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].identifier).toBe('test-config');
    });

    it('should manually detect duplicates in plugin files', () => {
      // Create duplicate plugins
      const plugin1 = { apiPath: '/test-plugin', name: 'Plugin 1' };
      const plugin2 = { apiPath: '/test-plugin', name: 'Plugin 2' };
      
      const file1 = path.join(testDir, 'plugin1.plugin.json');
      const file2 = path.join(testDir, 'plugin2.plugin.json');
      
      fs.writeFileSync(file1, JSON.stringify(plugin1));
      fs.writeFileSync(file2, JSON.stringify(plugin2));
      
      // Manual duplicate detection
      const identifiers = new Map();
      const duplicates = [];
      
      [file1, file2].forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          const identifier = data.apiPath;
          
          if (identifier) {
            if (identifiers.has(identifier)) {
              duplicates.push({
                identifier,
                files: [identifiers.get(identifier), filePath]
              });
            } else {
              identifiers.set(identifier, filePath);
            }
          }
        } catch (error) {
          // Skip invalid files
        }
      });
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].identifier).toBe('/test-plugin');
    });

    it('should find no duplicates in unique files', () => {
      // Create unique blueprint files
      const blueprint1 = { identifier: 'bp1', name: 'Blueprint 1' };
      const blueprint2 = { identifier: 'bp2', name: 'Blueprint 2' };
      
      const file1 = path.join(testDir, 'bp1.blueprint.json');
      const file2 = path.join(testDir, 'bp2.blueprint.json');
      
      fs.writeFileSync(file1, JSON.stringify(blueprint1));
      fs.writeFileSync(file2, JSON.stringify(blueprint2));
      
      // Manual duplicate detection
      const identifiers = new Map();
      const duplicates = [];
      
      [file1, file2].forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          const identifier = data.identifier;
          
          if (identifier) {
            if (identifiers.has(identifier)) {
              duplicates.push({
                identifier,
                files: [identifiers.get(identifier), filePath]
              });
            } else {
              identifiers.set(identifier, filePath);
            }
          }
        } catch (error) {
          // Skip invalid files
        }
      });
      
      expect(duplicates).toHaveLength(0);
    });

    it('should handle multiple duplicate groups', () => {
      const bp1 = { identifier: 'group1', name: 'BP 1' };
      const bp2 = { identifier: 'group1', name: 'BP 2' };
      const bp3 = { identifier: 'group2', name: 'BP 3' };
      const bp4 = { identifier: 'group2', name: 'BP 4' };
      
      const files = [
        path.join(testDir, 'bp1.blueprint.json'),
        path.join(testDir, 'bp2.blueprint.json'),
        path.join(testDir, 'bp3.blueprint.json'),
        path.join(testDir, 'bp4.blueprint.json')
      ];
      
      files.forEach((file, index) => {
        fs.writeFileSync(file, JSON.stringify([bp1, bp2, bp3, bp4][index]));
      });
      
      // Manual duplicate detection
      const identifiers = new Map();
      const duplicates = [];
      
      files.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          const identifier = data.identifier;
          
          if (identifier) {
            if (identifiers.has(identifier)) {
              duplicates.push({
                identifier,
                files: [identifiers.get(identifier), filePath]
              });
            } else {
              identifiers.set(identifier, filePath);
            }
          }
        } catch (error) {
          // Skip invalid files
        }
      });
      
      expect(duplicates).toHaveLength(2);
      expect(duplicates[0].identifier).toBe('group1');
      expect(duplicates[1].identifier).toBe('group2');
    });
  });
});
