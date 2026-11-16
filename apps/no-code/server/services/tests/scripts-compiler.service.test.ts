import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  compileScript,
  resolveScriptSpecifier,
  normalizeScriptIdentifier,
  scriptGlobalName,
} from '../scripts-compiler.service';
import { compileVueComponent, rewriteScriptImports } from '../components-compiler.service';
import { inferType } from '../script-types';

describe('scripts compiler', () => {
  it('compiles and minifies TypeScript', async () => {
    const { js } = await compileScript(
      `export const add = (firstNumber: number, secondNumber: number): number => firstNumber + secondNumber;`,
      'utils/demo',
    );
    assert.ok(!js.includes(': number'));
    assert.ok(!js.includes('firstNumber'), 'identifiers should be mangled');
    assert.ok(js.includes('export'));
  });

  it('rewrites relative imports to the served url', async () => {
    const { js } = await compileScript(`import { a } from '../shared/a.ts'; export const b = a + 1;`, 'utils/demo');
    assert.ok(js.includes('/api/static/scripts/shared/a.js'), js);
  });

  it('maps vue to the host global, keeping named imports', async () => {
    const { js } = await compileScript(`import { ref } from 'vue'; export const r = ref(1);`, 'x');
    assert.ok(js.includes('window.Vue'), js);
  });

  it('rejects unsupported bare imports and escaping paths', async () => {
    await assert.rejects(compileScript(`import _ from 'lodash'; export default _;`, 'x'));
    await assert.rejects(compileScript(`import a from '../../a'; export default a;`, 'x'));
    await assert.rejects(compileScript(`export const = ;`, 'x'));
  });

  it('resolves specifiers into identifiers', () => {
    assert.equal(resolveScriptSpecifier('./utils/demo.ts'), 'utils/demo');
    assert.equal(resolveScriptSpecifier('../a.js', 'utils/demo'), 'a');
    assert.equal(resolveScriptSpecifier('./b', 'utils/demo'), 'utils/b');
    assert.equal(resolveScriptSpecifier('../a', 'demo'), null);
    assert.equal(normalizeScriptIdentifier('./utils/demo.ts'), 'utils/demo');
  });
});

describe('component script imports', () => {
  it('only rewrites imports of existing scripts', () => {
    const src = `import {x} from './utils/demo.ts'\nimport y from './other.ts'\nimport C from './C.vue'`;
    const { content, scripts } = rewriteScriptImports(src, ['utils/demo']);
    assert.deepEqual(scripts, ['utils/demo']);
    assert.ok(content.includes(`'qelos-script:utils/demo'`));
    assert.ok(content.includes(`'./other.ts'`));
    assert.ok(content.includes(`'./C.vue'`));
  });

  it('compiles a component that imports a script and loads it at runtime', async () => {
    const result = await compileVueComponent(
      `<template><div>{{ double(2) }}</div></template>
<script setup lang="ts">
import { double } from './utils/demo.ts'
</script>`,
      'http://localhost',
      [],
      ['utils/demo'],
    );
    const global = scriptGlobalName('utils/demo');
    assert.ok(result.js.startsWith(`import * as ${global} from '/api/static/scripts/utils/demo.js';`), result.js.slice(0, 200));
    assert.ok(result.js.includes(`window['${global}'] = ${global};`));
    // the UMD global branch (the only one reachable in a browser module) reads the bridged global
    assert.ok(result.js.includes(`.${global})`), 'UMD should read the global');
  });
});

describe('scripts api type inference', () => {
  it('infers component vs script', () => {
    assert.equal(inferType({ identifier: 'a', content: '' }), 'script');
    assert.equal(inferType({ identifier: 'a', componentName: 'A' }), 'component');
    assert.equal(inferType({ identifier: 'a.vue' }), 'component');
    assert.equal(inferType({ identifier: 'a', componentName: 'A', type: 'script' }), 'script');
  });
});
