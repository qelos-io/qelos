#!/usr/bin/env node
// Simple test script for integration function callings

// We'll use a direct require approach with CommonJS since we're running with tsx
const { editIntegrationsFunctionCallings } = require('./server/services/function-callings/index');

// Main test function
function runTest() {
  try {

    console.log('Integration function callings loaded successfully!');
    console.log(`Found ${editIntegrationsFunctionCallings.length} integration function callings:`);

    // Print each function calling name and verify it has a handler
    editIntegrationsFunctionCallings.forEach((calling, index) => {
      console.log(`${index + 1}. ${calling.name} - Has handler: ${typeof calling.handler === 'function' ? 'Yes' : 'No'}`);
    });

    // Verify specific function callings exist
    const functionNames = editIntegrationsFunctionCallings.map(fn => fn.name);
    const requiredFunctions = [
      'create_connection',
      'get_connection',
      'update_connection',
      'remove_connection',
      'list_connections',
      'create_integration',
      'update_integration',
      'toggle_integration_status',
      'remove_integration',
      'list_integrations',
      'get_webhook_sample',
      'build_data_manipulation'
    ];

    console.log('\nVerifying required functions:');
    requiredFunctions.forEach(name => {
      const exists = functionNames.includes(name);
      console.log(`- ${name}: ${exists ? '✅ Found' : '❌ Missing'}`);
    });

    // Check if any functions are missing
    const missingFunctions = requiredFunctions.filter(name => !functionNames.includes(name));
    if (missingFunctions.length > 0) {
      console.error('\n❌ Missing required functions:', missingFunctions);
      process.exit(1);
    } else {
      console.log('\n✅ All required functions are present!');
    }
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

// Run the test
runTest();
