import { internalServicesSecret } from "../../config";
import { service } from "@qelos/api-kit";

const aiService = service('AI', { port: process.env.AI_SERVICE_PORT || 9007 });


export function callPublicAiService(url: string, {tenant, user}: {tenant: string, user: string}, {data, method = 'GET'}: {data?: any, method: string}) {
  return aiService({
    headers: { 'Content-Type': 'application/json', internal_secret: internalServicesSecret, user, tenant },
    method,
    data,
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}

function callAiService(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', tenant: string, data?: any) {
  return aiService({
    headers: { internal_secret: internalServicesSecret, tenant },
    method,
    data,
    url,
  })
    .then((axiosRes: any) => axiosRes.data)
}

export function chatCompletion(tenant: string, body: { authentication: any, source: any, payload: any }) {
  return callAiService(`/internal-api/chat-completion`, 'POST', tenant, body);
}

export function chatCompletionForUserByIntegration(tenant: string, user: string, body: { integrationId: string, threadId?: string, messages: any[] }) {
  return callPublicAiService(`/api/ai/${body.integrationId}/chat-completion/${body.threadId}`, {tenant, user}, {data: body, method: 'POST'});
}

export function uploadContentToStorage(tenant: string, body: { content: string | object, fileName?: string, metadata?: any, sourceId: string, integrationId: string, vectorStoreId?: string }) {
  return callAiService(`/internal-api/ai/sources/${body.sourceId}/storage/upload`, 'POST', tenant, body);
}

export function clearStorageFiles(tenant: string, body: { fileIds?: string[], sourceId: string, integrationId: string, vectorStoreId?: string }) {
  return callAiService(`/internal-api/ai/sources/${body.sourceId}/storage/clear`, 'POST', tenant, body);
}

export function getVectorStores(tenant: string, options?: { scope?: string, subjectId?: string, agent?: string }) {
  const params = new URLSearchParams();
  if (options?.scope) params.append('scope', options.scope);
  if (options?.subjectId) params.append('subjectId', options.subjectId);
  if (options?.agent) params.append('agent', options.agent);
  
  const query = params.toString();
  const url = `/internal-api/ai/vector-stores${query ? '?' + query : ''}`;
  
  return callAiService(url, 'GET', tenant);
}
