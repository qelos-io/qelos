/**
 * Integration test for the Vue Component Compiler service
 * Using Node.js built-in test module
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// Import the module to test with real implementation
import { compileVueComponent } from '../components-compiler.service';

describe('Vue Component Compiler', () => {
  it('should successfully compile a simple Vue component', async () => {
    // Arrange - using the simplest possible Vue component
    const simpleComponent = '<template><div>Hello World</div></template>';
    
    // Act
    const result = await compileVueComponent(simpleComponent);
    
    // Assert
    assert.equal(typeof result, 'object');
    assert.equal(typeof result.js, 'string');
    assert.equal(typeof result.css, 'string');
    
    // The compiled result should be valid JavaScript code
    assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
    
    // Verify it's a client-side component (ES module)
    assert.ok(result.js.includes('export default'), 'Should export the component');
    assert.ok(!result.js.includes('ssrRender'), 'Should not contain SSR-specific code');
  });
  
  it('should compile a component with script and template sections', async () => {
    // Arrange - component with script and template - using single-line format to avoid whitespace issues
    const componentWithScript = `<template><div>{{ message }}</div></template><script>export default { data() { return { message: 'Hello from Vue!' } } }</script>`;
    
    // Act
    const result = await compileVueComponent(componentWithScript);
    
    // Debug output
    console.log('Compiled JS output:', result.js);
    
    // Assert
    assert.equal(typeof result, 'object');
    assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
    
    // Verify the compiled code contains expected Vue component structure
    assert.ok(result.js.includes('export default'), 'Compiled JS should include export default');
    assert.ok(result.js.includes('data'), 'Compiled JS should include data function');
    assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    
    // Verify it's a client-side component
    assert.ok(!result.js.includes('ssrRender'), 'Should not contain SSR-specific code');
    assert.ok(result.js.includes('defineComponent') || result.js.includes('createElementVNode'), 'Should use client-side Vue APIs');
  });

  it('should handle errors during compilation gracefully', async () => {
    // Arrange - component with invalid template
    const invalidComponent = `<template><div>{{ message }</template>`;
    
    // Act & Assert
    await assert.rejects(
      async () => await compileVueComponent(invalidComponent),
      /Vue SFC parsing error/
    );
  });

  it('should compile a component with script setup syntax', async () => {
    // Arrange - component with script setup syntax (with TypeScript)
    const componentWithScriptSetup = `<script setup>
import { computed, defineProps } from 'vue';

const props = defineProps({
  value: String
});

const valueAsSfeHTML = computed(() => {
  if (!props.value) return '';
  return props.value.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/\n/g, '<br/>');
})
</script>

<template>
  <div class="pre" v-html="valueAsSfeHTML"></div>
</template>

<style scoped>
.pre {
  white-space: pre;
}
</style>`;
    
    // Act
    const result = await compileVueComponent(componentWithScriptSetup);
    
    // Assert
    assert.equal(typeof result, 'object');
    assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
    assert.ok(result.css.length > 0, 'Compiled CSS should not be empty');
    
    // Verify the compiled code contains expected Vue component structure
    assert.ok(result.js.includes('props:'), 'Compiled JS should include props');
    assert.ok(result.js.includes('computed'), 'Compiled JS should include computed');
    assert.ok(result.js.includes('valueAsSfeHTML'), 'Compiled JS should include the computed property');
    
    // Verify CSS content
    assert.ok(result.css.includes('white-space: pre'), 'CSS should contain the white-space property');
  });

  it('should describe all props', async () => {
        // Arrange - component with script setup syntax (with TypeScript)
        const componentWithScriptSetup = `<script setup>
        // No need to import defineProps as it's a compiler macro
        
        const props = defineProps({
          a: String,
          b: Number,
          c: Boolean,
        });
        </script>
        
        <template>
          <div>{{ props.a }}: {{ props.b }}</div>
        </template>`;
            
            // Act
            const result = await compileVueComponent(componentWithScriptSetup);

            // Assert
            assert.equal(typeof result, 'object');
            assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
            
            // Print the result first to see what's happening
            console.log('Compiled JS output for props test:', result.js);
            
            // Verify the compiled code contains expected Vue component structure
            assert.ok(result.js.includes('props:'), 'Compiled JS should include props');
            assert.ok(result.js.includes('a:'), 'Compiled JS should include a prop');
            assert.ok(result.js.includes('b:'), 'Compiled JS should include b prop');
            assert.ok(result.js.includes('c:'), 'Compiled JS should include c prop');
  })

  it('should describe all props from typescript definitions', async () => {
            // Arrange - component with script setup syntax (with TypeScript)
            const componentWithScriptSetup = `<script setup lang="ts">
            // No need to import defineProps as it's a compiler macro
            
            const props = defineProps<{a: string, b: number, c: boolean}>();
            </script>
            
            <template>
              <div>{{ props.a }}: {{ props.b }}</div>
            </template>`;
                
                // Act
                const result = await compileVueComponent(componentWithScriptSetup);
    
                // Assert
                assert.equal(typeof result, 'object');
                assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
                
                // Print the result first to see what's happening
                console.log('Compiled JS output for props test:', result.js);
                
                // Verify the compiled code contains expected Vue component structure
                assert.ok(result.js.includes('props:'), 'Compiled JS should include props');
                assert.ok(result.js.includes('a:'), 'Compiled JS should include a prop');
                assert.ok(result.js.includes('b:'), 'Compiled JS should include b prop');
                assert.ok(result.js.includes('c:'), 'Compiled JS should include c prop');
    
    
                console.log('Compiled JS output for props test:', result.js);
  })
});