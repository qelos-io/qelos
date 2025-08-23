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

    // Assert
    assert.equal(typeof result, 'object');
    assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
    
    // Verify the compiled code contains expected Vue component structure
    assert.ok(result.js.includes('export default'), 'Compiled JS should include export default');
    assert.ok(result.js.includes('data'), 'Compiled JS should include data function');
    assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    
    // Verify it's a client-side component
    assert.ok(!result.js.includes('ssrRender'), 'Should not contain SSR-specific code');
  });

  it('should handle errors during compilation gracefully', async () => {
    // Arrange - component with invalid template
    const invalidComponent = `<template><div>{{ message }</template>`;
    
    // Act & Assert
    await assert.rejects(
      async () => await compileVueComponent(invalidComponent),
      /Error: failed to compile component/
    );
  });

  it('should compile a component with script setup syntax', async () => {
    // Arrange - component with script setup syntax (with TypeScript)
    const componentWithScriptSetup = `<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: String
});

const valueAsSfeHTML = computed(() => {
  if (!props.value) return '';
  return props.value.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/\\n/g, '<br/>');
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
    
    // Verify CSS content exists (without checking for specific properties that might be minified)
    assert.ok(result.css.length > 0, 'Compiled CSS should not be empty');
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
                
                // Verify the compiled code contains expected Vue component structure
                assert.ok(result.js.includes('props:'), 'Compiled JS should include props');
                assert.ok(result.js.includes('a:'), 'Compiled JS should include a prop');
                assert.ok(result.js.includes('b:'), 'Compiled JS should include b prop');
                assert.ok(result.js.includes('c:'), 'Compiled JS should include c prop');
  })

  describe('vue components with options api', () => {
    it('should compile vue components with options api', async () => {
      const componentWithOptionsApi = `<script>
      export default {
        data() {
        return {
          message: 'Hello from Vue!'
        }
      }
    }
    </script>
    
    <template>
      <div>{{ message }}</div>
    </template>`;
        
        // Act
        const result = await compileVueComponent(componentWithOptionsApi);
    
        // Assert
        assert.equal(typeof result, 'object');
        assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
        
        // Verify the compiled code contains expected Vue component structure
        assert.ok(result.js.includes('data'), 'Compiled JS should include data function');
        assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    })

    it('should compile vue components with options api and props', async () => {
      const componentWithOptionsApi = `<script>
      export default {
        props: {
          message: String
        },
        data() {
        return {
          message: 'Hello from Vue!'
        }
      }
    }
    </script>
    
    <template>
      <div>{{ message }}</div>
    </template>`;
        
        // Act
        const result = await compileVueComponent(componentWithOptionsApi);
    
        // Assert
        assert.equal(typeof result, 'object');
        assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
        
        // Verify the compiled code contains expected Vue component structure
        assert.ok(result.js.includes('props'), 'Compiled JS should include props');
        assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    })

    it('should compile vue components with options api and props and data', async () => {
      const componentWithOptionsApi = `<script>
      export default {
        props: {
          message: String
        },
        data() {
        return {
          message: 'Hello from Vue!'
        }
      }
    }
    </script>
    
    <template>
      <div>{{ message }}</div>
    </template>`;
        
        // Act
        const result = await compileVueComponent(componentWithOptionsApi);
    
        // Assert
        assert.equal(typeof result, 'object');
        assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
        
        assert.ok(result.js.includes('props'), 'Compiled JS should include props');
        assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    })

    it('should compile vue components with options api and props and data and methods', async () => {
      const componentWithOptionsApi = `<script>
      export default {
        props: {
          message: String
        },
        data() {
        return {
          message: 'Hello from Vue!'
        }
      },
      methods: {
        reverseMessage() {
          this.message = this.message.split('').reverse().join('');
        }
      }
    }
    </script>
    
    <template>
      <div>{{ message }}</div>
      <button @click="reverseMessage">Reverse</button>
    </template>`;
        
        // Act
        const result = await compileVueComponent(componentWithOptionsApi);
    
        // Assert
        assert.equal(typeof result, 'object');
        assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
        
        assert.ok(result.js.includes('props'), 'Compiled JS should include props');
        assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    })

    it('should compile vue components with options api and props and data and methods and computed', async () => {
      const componentWithOptionsApi = `<script>
      export default {
        props: {
          message: String
        },
        data() {
        return {
          message: 'Hello from Vue!'
        }
      },
      methods: {
        reverseMessage() {
          this.message = this.message.split('').reverse().join('');
        }
      },
      computed: {
        reversedMessage() {
          return this.message.split('').reverse().join('');
        }
      }
    }
    </script>
    
    <template>
      <div>{{ message }}</div>
      <button @click="reverseMessage">Reverse</button>
      <div>{{ reversedMessage }}</div>
    </template>`;
        
        // Act
        const result = await compileVueComponent(componentWithOptionsApi);
    
        // Assert
        assert.equal(typeof result, 'object');
        assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
        
        assert.ok(result.js.includes('props'), 'Compiled JS should include props');
        assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    })

    it('should compile with imports from vue-router', async () => {
      const componentWithOptionsApi = `<script>
      import { ref } from 'vue';
      import { useRouter } from 'vue-router';
      export default {
        setup() {
          const router = useRouter();
          return {
            router,
            message: ref('Hello from Vue!')
          }
      }
    }
    </script>
    
    <template>
      <div>{{ message }}: {{ router.currentRoute }}</div>
    </template>`;
        
        // Act
        const result = await compileVueComponent(componentWithOptionsApi);
    
        // Assert
        assert.equal(typeof result, 'object');
        assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
        
        // Check for reactive data preservation
        assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    })
    
    it('should compile with imports from element-plus', async () => {
      const componentWithOptionsApi = `<script>
      import { ref } from 'vue';
      import { ElMessage } from 'element-plus';
      export default {
        setup() {
          const showMessage = () => {
            ElMessage.success('Success message');
          };
          return {
            showMessage,
            message: ref('Hello from Element Plus!')
          }
        }
      }
      </script>
      
      <template>
        <div>{{ message }}</div>
        <button @click="showMessage">Show Message</button>
      </template>`;
          
      // Act
      const result = await compileVueComponent(componentWithOptionsApi);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
      
      // Check for reactive data preservation
      assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
      assert.ok(result.js.includes('showMessage'), 'Compiled JS should include the showMessage function');
    })
    
    it('should compile with multiple framework imports', async () => {
      const componentWithOptionsApi = `<script>
      import { ref, computed } from 'vue';
      import { useRouter, useRoute } from 'vue-router';
      import { ElMessage, ElNotification } from 'element-plus';
      export default {
        setup() {
          const router = useRouter();
          const route = useRoute();
          const message = ref('Hello from frameworks!');
          const computedValue = computed(() => message.value + ' - ' + route.path);
          
          const showMessage = () => {
            ElMessage.success('Success message');
            ElNotification.info('Info notification');
            message.value = 'Message changed!';
          };
          
          return {
            router,
            route,
            message,
            computedValue,
            showMessage
          }
        }
      }
      </script>
      
      <template>
        <div>{{ computedValue }}</div>
        <button @click="showMessage">Show Message</button>
        <div>Current route: {{ route.path }}</div>
      </template>`;
          
      // Act
      const result = await compileVueComponent(componentWithOptionsApi);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
      
      // Check for reactive data preservation
      assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
      assert.ok(result.js.includes('computedValue'), 'Compiled JS should include the computedValue computed property');
      assert.ok(result.js.includes('showMessage'), 'Compiled JS should include the showMessage function');
    })
  })

  describe('vue components with script setup', () => {
    it('should compile vue components with script setup', async () => {
      const componentWithScriptSetup = `<script setup>
      const message = 'Hello from Vue!';
      </script>
      
      <template>
        <div>{{ message }}</div>
      </template>`;
          
      // Act
      const result = await compileVueComponent(componentWithScriptSetup);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
    })

    it('should compile with imports from vue-router', async () => {
      const componentWithScriptSetup = `<script setup>
      import { ref } from 'vue';
      import { useRouter } from 'vue-router';
      
      const message = ref('Hello from Vue!');
      const router = useRouter();

      setTimeout(() => {
        message.value = 'Hello from Vue!' + router.currentRoute.value;
      }, 1000);
      </script>
      <template>
        <div>{{ message }}: {{ router.currentRoute }}</div>
      </template>`;
          
      // Act
      const result = await compileVueComponent(componentWithScriptSetup);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');

      console.log(result.js);
      
      // Check for reactive data preservation
      assert.ok(result.js.includes('router'), 'Compiled JS should include the router variable');
    })
    
    it('should compile with imports from element-plus', async () => {
      const componentWithScriptSetup = `<script setup>
      import { ref } from 'vue';
      import { ElMessage } from 'element-plus';
      
      const message = ref('Hello from Element Plus!');
      
      function showMessage() {
        ElMessage.success('Success message');
      }
      </script>
      
      <template>
        <div>{{ message }}</div>
        <button @click="showMessage">Show Message</button>
      </template>`;
          
      // Act
      const result = await compileVueComponent(componentWithScriptSetup);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
      
      // Check for reactive data preservation
      assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    })
    
    it('should compile with multiple framework imports', async () => {
      const componentWithScriptSetup = `<template>
  <div>{{ message }}</div>
  <button @click="showMessage">Show Message</button>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const message = ref('Hello from frameworks!');
const router = useRouter();

function showMessage() {
  ElMessage.success('Success message');
  message.value = 'Message changed!';
}
</script>`;
          
      // Act
      const result = await compileVueComponent(componentWithScriptSetup);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');      
    })
  })

  describe('vue components with script and setup function', () => {
    it('should compile vue components with script and setup function', async () => {
      const componentWithScriptAndSetup = `<script>
      import { ref } from 'vue';
      export default {
        setup() {
        return {
          message: ref('Hello from Vue!')
        }
      }
    }
    </script>
    
    <template>
      <div>{{ message }}</div>
    </template>`;
        
        // Act
        const result = await compileVueComponent(componentWithScriptAndSetup);
    
        // Assert
        assert.equal(typeof result, 'object');
        assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
        
        // Check for reactive data preservation
        assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
    })
    
    it('should compile with imports from vue-router', async () => {
      const componentWithScriptAndSetup = `<script>
      import { ref } from 'vue';
      import { useRouter } from 'vue-router';
      export default {
        setup() {
          const router = useRouter();
          return {
            router,
            message: ref('Hello from Vue!')
          }
        }
      }
      </script>
      
      <template>
        <div>{{ message }}: {{ router.currentRoute }}</div>
      </template>`;
          
      // Act
      const result = await compileVueComponent(componentWithScriptAndSetup);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
      
      // Check for reactive data preservation
      assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
      assert.ok(result.js.includes('router'), 'Compiled JS should include the router variable');
    })
    
    it('should compile with imports from element-plus', async () => {
      const componentWithScriptAndSetup = `<script>
      import { ref } from 'vue';
      import { ElMessage } from 'element-plus';
      export default {
        setup() {
          const showMessage = () => {
            ElMessage.success('Success message');
          };
          return {
            showMessage,
            message: ref('Hello from Element Plus!')
          }
        }
      }
      </script>
      
      <template>
        <div>{{ message }}</div>
        <button @click="showMessage">Show Message</button>
      </template>`;
          
      // Act
      const result = await compileVueComponent(componentWithScriptAndSetup);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
      
      // Check for reactive data preservation
      assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
      assert.ok(result.js.includes('showMessage'), 'Compiled JS should include the showMessage function');
    })
    
    it('should compile with multiple framework imports', async () => {
      const componentWithScriptAndSetup = `<script>
      import { ref, computed } from 'vue';
      import { useRouter, useRoute } from 'vue-router';
      import { ElMessage, ElNotification } from 'element-plus';
      export default {
        setup() {
          const router = useRouter();
          const route = useRoute();
          const message = ref('Hello from frameworks!');
          const computedValue = computed(() => message.value + ' - ' + route.path);
          
          const showMessage = () => {
            ElMessage.success('Success message');
            ElNotification.info('Info notification');
            message.value = 'Message changed!';
          };
          
          return {
            router,
            route,
            message,
            computedValue,
            showMessage
          }
        }
      }
      </script>
      
      <template>
        <div>{{ computedValue }}</div>
        <button @click="showMessage">Show Message</button>
        <div>Current route: {{ route.path }}</div>
      </template>`;
          
      // Act
      const result = await compileVueComponent(componentWithScriptAndSetup);
  
      // Assert
      assert.equal(typeof result, 'object');
      assert.ok(result.js.length > 0, 'Compiled JS should not be empty');
      
      // Check for reactive data preservation
      assert.ok(result.js.includes('message'), 'Compiled JS should include the message variable');
      assert.ok(result.js.includes('computedValue'), 'Compiled JS should include the computedValue computed property');
      assert.ok(result.js.includes('showMessage'), 'Compiled JS should include the showMessage function');
    })
  })
});