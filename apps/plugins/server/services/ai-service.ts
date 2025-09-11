import { internalServicesSecret } from "../../config";
import { service } from "@qelos/api-kit";

const aiService = service('AI', { port: process.env.AI_SERVICE_PORT || 9007 });


export function callPublicAiService(url: string, {tenant, user}: {tenant: string, user: string}, {data, method = 'GET'}: {data?: any, method: string}) {
  return aiService({
    headers: { 'Content-Type': 'application/json', user, tenant },
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
