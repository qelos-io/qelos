import { defineStore } from "pinia";
import { computed, toRef } from "vue";
import { useIntegrationSourcesStore } from "@/modules/integrations/store/integration-sources";
import sdk from "@/services/sdk";

export const useAskAdminAi = defineStore('ask-admin-ai', function useAskAi() {
  const groupedSources = toRef(useIntegrationSourcesStore(), 'groupedSources');
  const aiSources = computed(() => [
    ...(groupedSources.value.claudeai || []),
    ...(groupedSources.value.openai || []),
    ...(groupedSources.value.gemini || []),
  ])

  async function askAiJson(source: string, prompt: string, expectedResponseSchema: any | string) {
    const response = await sdk.callJsonApi<{ choices?: { message?: { content?: string } }[] }>(`/api/ai/sources/${source}/chat-completion/plain`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: prompt + '\n' +
              'Return the result in a json object with the following schema: ' +
              (typeof expectedResponseSchema === 'string' ? expectedResponseSchema : JSON.stringify(expectedResponseSchema))
          }]
      })
    })
    const result = JSON.parse(response.choices?.[0].message?.content || '{}')
    return result;
  }

  return {
    askAiJson,
    aiSources
  }
});