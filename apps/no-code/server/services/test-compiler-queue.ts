import { compileVueComponent } from './components-compiler.service';

// Test component that simulates a real Vue component
const testComponent = `
<template>
  <div class="test-component">
    <h1>{{ title }}</h1>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('Test Component')
const message = ref('This is a test component for the queue system')
</script>

<style scoped>
.test-component {
  padding: 20px;
  background: #f0f0f0;
}
</style>
`;

async function testCompilerQueue() {
  console.log('Testing compiler queue system...');
  
  // Test multiple concurrent builds
  const promises: Promise<{ id: number; success: boolean; result?: any; error?: any }>[] = [];
  const startTime = Date.now();
  
  for (let i = 0; i < 5; i++) {
    console.log(`Submitting build ${i + 1}...`);
    const promise = compileVueComponent(testComponent, `http://localhost:300${i}`)
      .then(result => {
        console.log(`Build ${i + 1} completed successfully`);
        return { id: i + 1, success: true, result };
      })
      .catch(error => {
        console.error(`Build ${i + 1} failed:`, error.message);
        return { id: i + 1, success: false, error };
      });
    promises.push(promise);
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  console.log('\n--- Test Results ---');
  console.log(`Total time: ${endTime - startTime}ms`);
  console.log(`Successful builds: ${results.filter(r => r.success).length}/${results.length}`);
  
  // Check if queue is working (builds should be sequential with limited concurrency)
  const memoryUsage = process.memoryUsage();
  console.log('\n--- Memory Usage ---');
  console.log(`Heap used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Heap total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`);
}

// Run test if this file is executed directly
if (require.main === module) {
  testCompilerQueue().catch(console.error);
}

export { testCompilerQueue };
