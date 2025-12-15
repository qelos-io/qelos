// Test script to verify token usage events are being emitted correctly
const { createAIService } = require('./server/services/ai-service');

// Mock source and authentication
const mockSource = {
  kind: 'openai',
  tenant: 'test-tenant',
  _id: 'test-source-id',
  metadata: {
    defaultModel: 'gpt-4.1-mini'
  }
};

const mockAuthentication = {
  token: 'test-token'
};

// Test context
const testContext = {
  tenant: 'test-tenant',
  userId: 'test-user-id',
  workspaceId: 'test-workspace-id',
  integrationId: 'test-integration-id',
  integrationName: 'Test Integration'
};

// Create AI service
const aiService = createAIService(mockSource, mockAuthentication);

// Test non-streaming completion
async function testNonStreamingCompletion() {
  console.log('Testing non-streaming completion...');
  try {
    const response = await aiService.createChatCompletion({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'Say hello' }],
      context: testContext
    });
    console.log('Non-streaming test completed');
    console.log('Usage:', response.usage);
  } catch (error) {
    console.error('Error in non-streaming test:', error.message);
  }
}

// Test streaming completion
async function testStreamingCompletion() {
  console.log('Testing streaming completion...');
  try {
    const stream = await aiService.createChatCompletionStream({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'Say hello' }],
      context: testContext
    });
    
    for await (const chunk of stream) {
      if (chunk.usage) {
        console.log('Streaming usage received:', chunk.usage);
        break;
      }
    }
    console.log('Streaming test completed');
  } catch (error) {
    console.error('Error in streaming test:', error.message);
  }
}

// Run tests
(async () => {
  await testNonStreamingCompletion();
  await testStreamingCompletion();
  console.log('All tests completed');
})();
