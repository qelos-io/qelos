const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

describe('Push Command - Duplicate Detection Integration', () => {
  let testDir;
  let originalCwd;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-duplicate-test-'));
    originalCwd = process.cwd();
    
    // Create resource directories
    fs.mkdirSync(path.join(testDir, 'blueprints'));
    fs.mkdirSync(path.join(testDir, 'configs'));
    fs.mkdirSync(path.join(testDir, 'plugins'));
    fs.mkdirSync(path.join(testDir, 'components')); // Needed for "all" type
  });
  
  afterEach(() => {
    // Clean up test directory
    process.chdir(originalCwd);
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const runPushCommand = (type, dir) => {
    try {
      const output = execSync(`node cli.mjs push ${type} ${dir}`, { 
        cwd: path.join(__dirname, '../..'),
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

  describe('Blueprint duplicates', () => {
    it('should detect duplicate blueprint identifiers', () => {
      // Create duplicate blueprints
      const blueprint1 = { identifier: 'test-bp', name: 'Test Blueprint 1' };
      const blueprint2 = { identifier: 'test-bp', name: 'Test Blueprint 2' };
      
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'bp1.blueprint.json'),
        JSON.stringify(blueprint1)
      );
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'bp2.blueprint.json'),
        JSON.stringify(blueprint2)
      );
      
      const result = runPushCommand('blueprints', path.join(testDir, 'blueprints'));
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Duplicate identifier');
      expect(result.output).toContain('test-bp');
      expect(result.output).toContain('Please remove one of the duplicate files');
    });

    it('should allow unique blueprint identifiers', () => {
      const blueprint1 = { identifier: 'bp1', name: 'Blueprint 1' };
      const blueprint2 = { identifier: 'bp2', name: 'Blueprint 2' };
      
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'bp1.blueprint.json'),
        JSON.stringify(blueprint1)
      );
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'bp2.blueprint.json'),
        JSON.stringify(blueprint2)
      );
      
      const result = runPushCommand('blueprints', path.join(testDir, 'blueprints'));
      
      // Should not fail due to duplicates (might fail for other reasons like connection)
      expect(result.output).not.toContain('Duplicate identifier');
    });
  });

  describe('Config duplicates', () => {
    it('should detect duplicate config keys', () => {
      const config1 = { key: 'test-config', value: 'value1' };
      const config2 = { key: 'test-config', value: 'value2' };
      
      fs.writeFileSync(
        path.join(testDir, 'configs', 'config1.config.json'),
        JSON.stringify(config1)
      );
      fs.writeFileSync(
        path.join(testDir, 'configs', 'config2.config.json'),
        JSON.stringify(config2)
      );
      
      const result = runPushCommand('configs', path.join(testDir, 'configs'));
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Duplicate identifier');
      expect(result.output).toContain('test-config');
    });
  });

  describe('Plugin duplicates', () => {
    it('should detect duplicate plugin apiPaths', () => {
      const plugin1 = { apiPath: '/test-plugin', name: 'Plugin 1' };
      const plugin2 = { apiPath: '/test-plugin', name: 'Plugin 2' };
      
      fs.writeFileSync(
        path.join(testDir, 'plugins', 'plugin1.plugin.json'),
        JSON.stringify(plugin1)
      );
      fs.writeFileSync(
        path.join(testDir, 'plugins', 'plugin2.plugin.json'),
        JSON.stringify(plugin2)
      );
      
      const result = runPushCommand('plugins', path.join(testDir, 'plugins'));
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Duplicate identifier');
      expect(result.output).toContain('/test-plugin');
    });
  });

  describe('All resources', () => {
    it('should detect duplicates across all resource types', () => {
      // Create duplicates in multiple resource types
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'bp1.blueprint.json'),
        JSON.stringify({ identifier: 'dup', name: 'BP 1' })
      );
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'bp2.blueprint.json'),
        JSON.stringify({ identifier: 'dup', name: 'BP 2' })
      );
      
      fs.writeFileSync(
        path.join(testDir, 'configs', 'config1.config.json'),
        JSON.stringify({ key: 'dup', value: 'value1' })
      );
      fs.writeFileSync(
        path.join(testDir, 'configs', 'config2.config.json'),
        JSON.stringify({ key: 'dup', value: 'value2' })
      );
      
      const result = runPushCommand('all', testDir);
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Duplicate identifier');
      // Should detect duplicates in both blueprints and configs
    });
  });

  describe('Edge cases', () => {
    it('should not check duplicates when pushing a single file', () => {
      const blueprint = { identifier: 'test-bp', name: 'Test Blueprint' };
      const filePath = path.join(testDir, 'blueprints', 'single.blueprint.json');
      fs.writeFileSync(filePath, JSON.stringify(blueprint));
      
      const result = runPushCommand('blueprints', filePath);
      
      // Single file push should not check for duplicates
      expect(result.output).not.toContain('Duplicate identifier');
    });

    it('should handle empty directories', () => {
      const result = runPushCommand('blueprints', path.join(testDir, 'blueprints'));

      // Should not fail due to duplicates (might fail for other reasons like connection)
      expect(result.output).not.toContain('Duplicate identifier');
    });

    it('should handle files without identifiers', () => {
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'no-id.blueprint.json'),
        JSON.stringify({ name: 'No ID Blueprint' })
      );
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'no-id2.blueprint.json'),
        JSON.stringify({ name: 'No ID Blueprint 2' })
      );

      const result = runPushCommand('blueprints', path.join(testDir, 'blueprints'));

      // Should not fail due to duplicates (might fail for other reasons like connection)
      expect(result.output).not.toContain('Duplicate identifier');
    });
  });
});
