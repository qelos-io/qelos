// Example usage of the new Qelos AI SDK with sub-SDKs

import QelosSDK from '../src';
// Alternatively, you can import specific sub-SDKs:
// import { ThreadsSDK, ChatSDK, RAGSDK } from '../src/ai';

// Initialize the SDK
const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-instance.com',
  fetch: globalThis.fetch || require('node-fetch'),
  accessToken: 'your-access-token'
});

// ===== THREADS SUB-SDK =====
async function threadExamples() {
  // Create a new thread
  const thread = await sdk.ai.threads.create({
    integration: 'integration-id',
    title: 'Customer Support Chat'
  });
  
  // Get a specific thread
  const retrievedThread = await sdk.ai.threads.getOne(thread._id!);
  
  // List threads with filters
  const threads = await sdk.ai.threads.list({
    integration: 'integration-id',
    limit: 10,
    page: 1
  });
  
  // Delete a thread
  await sdk.ai.threads.delete(thread._id!);
}

// ===== CHAT SUB-SDK =====
async function chatExamples() {
  const integrationId = 'your-integration-id';
  const messages = [
    { role: 'user', content: 'Hello, how can you help me?' }
  ];
  
  // Non-streaming chat
  const response = await sdk.ai.chat.chat(integrationId, {
    messages,
    model: 'gpt-4',
    temperature: 0.7,
    queryParams: { bypassAdmin: true } // Optional query params
  });
  
  console.log(response.choices[0].message.content);
  
  // Streaming chat
  const stream = await sdk.ai.chat.stream(integrationId, {
    messages,
    stream: true
  });
  
  // Parse the SSE stream
  const processor = sdk.ai.chat.parseSSEStream(stream);
  for await (const chunk of processor) {
    if (chunk.choices?.[0]?.delta?.content) {
      console.log(chunk.choices[0].delta.content);
    }
  }
  
  // Chat in a thread
  const threadId = 'thread-id';
  const threadResponse = await sdk.ai.chat.chatInThread(integrationId, threadId, {
    messages
  });
  
  // Streaming chat in a thread
  const threadStream = await sdk.ai.chat.streamInThread(integrationId, threadId, {
    messages,
    stream: true
  });
  
  for await (const chunk of sdk.ai.chat.parseSSEStream(threadStream)) {
    console.log(chunk);
  }
}

// ===== RAG SUB-SDK =====
async function ragExamples() {
  const sourceId = 'your-ai-source-id';
  
  // Create vector storage
  const storage = await sdk.ai.rag.createStorage(sourceId, {
    integrationId: 'integration-id',
    scope: 'thread', // 'thread' | 'user' | 'workspace' | 'tenant'
    subjectId: 'thread-id', // Required for non-tenant scopes
    expirationAfterDays: 30
  });
  
  // Upload content to storage
  const uploadResult = await sdk.ai.rag.uploadContent(sourceId, {
    integrationId: 'integration-id',
    content: 'This is the content to be indexed for RAG.',
    fileName: 'document.txt',
    metadata: { type: 'documentation', category: 'help' }
  });
  
  // Upload JSON content
  const jsonUpload = await sdk.ai.rag.uploadContent(sourceId, {
    integrationId: 'integration-id',
    content: { title: 'Product Info', description: '...' },
    fileName: 'product-info.json'
  });
  
  // Clear specific files
  const clearResult = await sdk.ai.rag.clearStorage(sourceId, {
    integrationId: 'integration-id',
    fileIds: [uploadResult.fileId]
  });
  
  // Clear all files (if no fileIds provided)
  await sdk.ai.rag.clearStorage(sourceId, {
    integrationId: 'integrationId'
  });
  
  // Get vector stores (internal API - server-side only)
  const stores = await sdk.ai.rag.getVectorStores({
    scope: 'thread',
    subjectId: 'thread-id'
  });
}

// ===== COMBINED EXAMPLE =====
async function combinedExample() {
  // 1. Create a thread
  const thread = await sdk.ai.threads.create({
    integration: 'integration-id',
    title: 'RAG-enabled Chat'
  });
  
  // 2. Upload knowledge base content
  await sdk.ai.rag.uploadContent('source-id', {
    integrationId: 'integration-id',
    content: 'Your knowledge base content here...',
    fileName: 'knowledge-base.txt'
  });
  
  // 3. Chat with RAG
  const stream = await sdk.ai.chat.streamInThread(
    'integration-id',
    thread._id!,
    {
      messages: [
        { role: 'user', content: 'What do you know about the topic?' }
      ],
      stream: true
    }
  );
  
  // 4. Process the response
  for await (const chunk of sdk.ai.chat.parseSSEStream(stream)) {
    if (chunk.choices?.[0]?.delta?.content) {
      console.log(chunk.choices[0].delta.content);
    }
  }
}

// Export for reference
export {
  threadExamples,
  chatExamples,
  ragExamples,
  combinedExample
};
