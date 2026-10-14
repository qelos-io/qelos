// Configurations every tenant has. They are created on first visit to the settings page.
// Titles and descriptions of the known ones also live in CONFIGURATION_INFO (the registry below).

export type RequiredConfigurationDefinition = {
  title: string;
  description: string;
  kind?: string;
  public: boolean;
  metadata: Record<string, any>;
};

export const REQUIRED_CONFIGURATIONS: Record<string, RequiredConfigurationDefinition> = {
  'app-configuration': {
    title: 'Application Branding & Theme',
    description: 'Control your app name, app URL, logo, direction, language, and theme.',
    kind: 'app',
    public: true,
    metadata: {
      colorsPalette: {
        mainColor: '#264653',
        mainColorLight: '#1c4252',
        textColor: '#1c4252',
        secondaryColor: '#2a9d8f',
        thirdColor: '#e9c46a',
        bgColor: '#ffffff',
        bordersColor: '#e2e8f0',
        inputsTextColor: '#1c4252',
        inputsBgColor: '#f8fafc',
        linksColor: '#2a9d8f',
        navigationBgColor: '#1c4252',
        negativeColor: '#9b7a3a',
        buttonTextColor: '#ffffff',
        buttonBgColor: '#264653',
        focusColor: '#2a9d8f',
        fontFamily: 'Helvetica, Arial, sans-serif',
        headingsFontFamily: 'Helvetica, Arial, sans-serif',
        baseFontSize: 16,
        borderRadius: 4,
        buttonRadius: 4,
        spacing: 'normal',
        shadowStyle: 'light',
        animationSpeed: 250
      },
      description: '',
      direction: 'ltr',
      homeScreen: '',
      keywords: '',
      language: 'en',
      logoUrl: '',
      name: '',
      scriptUrl: '',
      slogan: '',
      themeStylesUrl: '',
      borderRadius: 5,
      baseFontSize: 16,
      websiteUrls: []
    }
  },
  'auth-configuration': {
    title: 'Authentication Experience',
    description: 'Customize login flows, user fields, and available social providers.',
    kind: 'auth',
    public: true,
    metadata: {
      treatUsernameAs: 'email',
      formPosition: 'right',
      loginTitle: '',
      showLoginPage: true,
      showRegisterPage: false,
      allowSocialAutoRegistration: true,
      additionalUserFields: [],
      socialLoginsSources: {},
      slots: {},
      disableUsernamePassword: false
    }
  },
  'mcp-configuration': {
    title: 'MCP Server',
    description: 'Control remote MCP tool exposure, OAuth callback URLs, and admin-only SDK access.',
    kind: 'mcp',
    public: false,
    metadata: {
      enabled: false,
      permittedCallbackUrls: [],
      exposedTools: [],
      adminOnly: true
    }
  },
  'ssr-scripts': {
    title: 'SSR Scripts',
    description: 'SSR scripts configuration.',
    kind: 'ssr',
    public: true,
    metadata: {
      head: '',
      body: ''
    }
  },
  'workspace-configuration': {
    title: 'Workspace Mode & Labels',
    description: 'Enable multi-workspace mode, labels, and creation permissions.',
    kind: 'workspace',
    public: true,
    metadata: {
      isActive: false,
      creationPrivilegedRoles: [],
      viewMembersPrivilegedWsRoles: [],
      labels: [],
      allowNonLabeledWorkspaces: true,
      allowNonWorkspaceUsers: true
    }
  },
  'users-header': {
    title: 'Users Header Template',
    description: 'Design a custom HTML header for the users list view.',
    kind: 'users-header',
    public: true,
    metadata: {
      html: '',
      active: false
    }
  }
};

export type ConfigurationGroupKey = 'application' | 'connections' | 'money';

export interface ConfigurationInfo {
  key: string;
  title: string;
  description: string;
  /** Font Awesome icon [prefix, name] */
  icon: [string, string];
  group: ConfigurationGroupKey;
  /** where the row leads when it is not the generic editor (for configurations edited elsewhere) */
  route?: { name: string; params?: Record<string, string> };
}

export const CONFIGURATION_GROUPS: { key: ConfigurationGroupKey; label: string }[] = [
  { key: 'application', label: 'Your application' },
  { key: 'connections', label: 'Connections & AI' },
  { key: 'money', label: 'People & money' },
];

/** The configurations the admin knows how to present. Anything else is shown as a custom configuration. */
export const CONFIGURATION_INFO: ConfigurationInfo[] = [
  { key: 'appearance', title: 'Appearance', description: 'Themes, colors, typography, and design tokens', icon: ['fas', 'palette'], group: 'application', route: { name: 'appearance' } },
  { key: 'app-configuration', title: 'App Settings', description: 'Configure application name, logo, and general settings', icon: ['fas', 'gear'], group: 'application' },
  { key: 'auth-configuration', title: 'Authentication Settings', description: 'Configure authentication methods, providers, and security settings', icon: ['fas', 'key'], group: 'application' },
  { key: 'workspace-configuration', title: 'Workspace Settings', description: 'Configure workspace defaults, permissions and structure', icon: ['far', 'building'], group: 'application' },
  { key: 'users-header', title: 'Users Header Template', description: 'Design a custom HTML header for the users list view.', icon: ['fas', 'table-columns'], group: 'application' },
  { key: 'ssr-scripts', title: 'SSR Scripts', description: 'Manage server-side rendering scripts and HTML templates', icon: ['fab', 'html5'], group: 'application' },
  { key: 'mcp-configuration', title: 'MCP Configuration', description: 'Configure remote MCP tool exposure and OAuth callback URLs', icon: ['fas', 'plug'], group: 'connections' },
  { key: 'global-ai-configuration', title: 'Global AI', description: 'Default AI provider and model settings for the whole application', icon: ['fas', 'wand-magic-sparkles'], group: 'connections' },
  { key: 'livekit-live-users', title: 'LiveKit live users', description: 'Real-time rooms and live user presence', icon: ['fas', 'video'], group: 'connections' },
  { key: 'payments-configuration', title: 'Payments & Plans', description: 'Configure pricing plans, coupons, and payment providers', icon: ['fas', 'tags'], group: 'money', route: { name: 'paymentsConfiguration' } },
];

const INFO_BY_KEY = new Map(CONFIGURATION_INFO.map((info) => [info.key, info]));

export const getConfigurationInfo = (key: string): ConfigurationInfo | undefined => {
  // auth configurations can be variants such as "auth-configuration-<tenant token>"
  return INFO_BY_KEY.get(key) ?? (key.startsWith('auth-configuration') ? INFO_BY_KEY.get('auth-configuration') : undefined);
};

export interface ListedConfiguration {
  key: string;
  kind?: string;
  public?: boolean;
  description?: string;
  updated?: string;
  [extra: string]: unknown;
}

export interface ConfigurationsView {
  /** known configurations, in registry order, grouped */
  groups: { key: ConfigurationGroupKey; label: string; rows: { info: ConfigurationInfo; config?: ListedConfiguration }[] }[];
  /** everything the registry does not know */
  custom: ListedConfiguration[];
}

const normalize = (value: string) => value.toLocaleLowerCase();

/**
 * Splits the configurations into the registry groups and the custom ones, applying the search text and the
 * public/private filter. A known configuration that does not exist yet still shows (it is created on first visit).
 */
export function buildConfigurationsView(
  list: ListedConfiguration[],
  options: { query?: string; visibility?: '' | 'public' | 'private'; translate?: (text: string) => string } = {},
): ConfigurationsView {
  const t = options.translate ?? ((text: string) => text);
  const query = normalize((options.query ?? '').trim());
  const byKey = new Map(list.map((config) => [config.key, config]));
  const visible = (config?: ListedConfiguration) =>
    !options.visibility || !config || (options.visibility === 'public' ? !!config.public : !config.public);
  const matches = (...texts: (string | undefined)[]) => !query || texts.some((text) => text && normalize(text).includes(query));

  const groups = CONFIGURATION_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    rows: CONFIGURATION_INFO.filter((info) => info.group === group.key)
      .map((info) => ({ info, config: byKey.get(info.key) }))
      .filter(({ info, config }) => visible(config) && matches(t(info.title), t(info.description), info.key)),
  })).filter((group) => group.rows.length);

  const custom = list
    .filter((config) => !getConfigurationInfo(config.key))
    .filter((config) => visible(config) && matches(config.key, config.kind, config.description));

  return { groups, custom };
}
