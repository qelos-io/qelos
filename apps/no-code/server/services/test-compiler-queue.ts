import { compileVueComponent, compileVueComponentsBulk } from './components-compiler.service';

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

function logMemory(label: string) {
  const memoryUsage = process.memoryUsage();
  console.log(`[${label}] Heap used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB, Heap total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
}

async function testCompilerQueue() {
  console.log('Testing compiler queue system with concurrent submissions...');

  // Test 1: Multiple concurrent builds via the queue (should not OOM)
  const promises: Promise<{ id: number; success: boolean; result?: any; error?: any }>[] = [];
  const startTime = Date.now();

  logMemory('Before submissions');

  for (let i = 0; i < 5; i++) {
    console.log(`Submitting build ${i + 1}...`);
    const promise = compileVueComponent(testComponent, `http://localhost:300${i}`)
      .then(result => {
        logMemory(`Build ${i + 1} done`);
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

  console.log('\n--- Queue Test Results ---');
  console.log(`Total time: ${endTime - startTime}ms`);
  console.log(`Successful builds: ${results.filter(r => r.success).length}/${results.length}`);
  logMemory('After all builds');

  // Test 2: Bulk compilation
  console.log('\n--- Testing Bulk Compilation ---');
  const bulkStartTime = Date.now();

  const bulkComponents = Array.from({ length: 3 }, (_, i) => ({
    fileContent: testComponent.replace('Test Component', `Bulk Component ${i + 1}`),
    identifier: `bulk-comp-${i + 1}`,
  }));

  logMemory('Before bulk');
  const bulkResults = await compileVueComponentsBulk(bulkComponents);
  const bulkEndTime = Date.now();

  console.log(`Bulk time: ${bulkEndTime - bulkStartTime}ms`);
  console.log(`Bulk successful: ${bulkResults.filter(r => r.success).length}/${bulkResults.length}`);
  logMemory('After bulk');
}

// Run test if this file is executed directly
if (require.main === module) {
  testCompilerQueue().catch(console.error);
}

export { testCompilerQueue };
