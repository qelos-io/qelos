import { computed } from 'vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';

export const FA_ICON_OPTIONS = [
  { identifier: 'robot', name: '🤖 Robot (fa-robot)' },
  { identifier: 'user-astronaut', name: '👩‍🚀 Astronaut (fa-user-astronaut)' },
  { identifier: 'comments', name: '💬 Comments (fa-comments)' },
  { identifier: 'lightbulb', name: '💡 Lightbulb (fa-lightbulb)' },
  { identifier: 'bolt', name: '⚡ Bolt (fa-bolt)' },
  { identifier: 'brain', name: '🧠 Brain (fa-brain)' },
  { identifier: 'gear', name: '⚙️ Gear (fa-gear)' },
  { identifier: 'question-circle', name: '❓ Question (fa-question-circle)' },
  { identifier: 'hands-helping', name: '🤝 Help (fa-hands-helping)' },
  { identifier: 'wand-magic-sparkles', name: '✨ Magic (fa-wand-magic-sparkles)' },
  { identifier: 'headset', name: '🎧 Support (fa-headset)' },
  { identifier: 'rocket', name: '🚀 Rocket (fa-rocket)' },
  { identifier: 'chart-line', name: '📈 Insights (fa-chart-line)' },
  { identifier: 'shield-check', name: '🛡️ Secure (fa-shield-check)' },
  { identifier: 'circle-info', name: 'ℹ️ Info (fa-circle-info)' },
  { identifier: 'flag-checkered', name: '🏁 Goals (fa-flag-checkered)' },
  { identifier: 'paper-plane', name: '🛫 Launch (fa-paper-plane)' },
  { identifier: 'puzzle-piece', name: '🧩 Puzzle (fa-puzzle-piece)' },
  { identifier: 'clipboard-list', name: '📋 Tasks (fa-clipboard-list)' },
  { identifier: 'star', name: '⭐ Favorite (fa-star)' },
];

type Option = { identifier: string; name: string };

/** options of the properties whose choices come from the app (AI agents, icons) */
export function usePropOptions() {
  const integrations = useIntegrationsStore();
  const chatIntegrations = computed(() => (integrations.integrations || []).filter((i: any) => i?.trigger?.operation === 'chatCompletion'));

  const resolvers: Record<string, () => Option[]> = {
    aiChatUrls: () =>
      chatIntegrations.value
        .map((integration: any) => {
          const id = integration?._id;
          if (!id) return null;
          const base = `/api/ai/${id}/chat-completion`;
          const url = integration?.trigger?.details?.recordThread ? `${base}/[threadId]` : base;
          const name = integration?.trigger?.details?.name || integration?.name || id;
          return { identifier: url, name: `${name} (${url})` };
        })
        .filter((o): o is Option => !!o),
    aiIntegrationIds: () =>
      chatIntegrations.value
        .map((integration: any) => ({ identifier: integration?._id, name: integration?.trigger?.details?.name || integration?.name || integration?._id }))
        .filter((o: Option) => !!o.identifier),
    faIcons: () => FA_ICON_OPTIONS,
  };

  return (prop: { options?: Option[]; optionsResolver?: string }): Option[] => (prop?.optionsResolver && resolvers[prop.optionsResolver] ? resolvers[prop.optionsResolver]() : prop?.options || []);
}
