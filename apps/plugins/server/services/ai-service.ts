import { internalServicesSecret } from "../../config";
import { service } from "@qelos/api-kit";

const aiService = service('AI', { port: process.env.AI_SERVICE_PORT || 9007 });

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