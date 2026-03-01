import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Qelos',
  description: 'Build AI Agents & SaaS Applications With Visual Builders',
  outDir: '../dist',
  lastUpdated: true,
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/qelos-icon.png' }],
    ['meta', { name: 'theme-color', content: '#2563eb' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'Qelos Documentation' }],
    ['meta', { name: 'og:description', content: 'Build AI Agents & SaaS Applications With Visual Builders' }],
  ],
  themeConfig: {
    siteTitle: false,
    logo: '/qelos-hq.png',
    nav: [
      { text: 'Guide', link: '/getting-started/intro' },
      { text: 'Tutorials', link: '/tutorials/' },
      { text: 'SDK', link: '/sdk/sdk' },
      { text: 'CLI', link: '/cli/' },
      { text: 'Plugins', link: '/plugins/create' },
      { text: 'Deployment', link: '/deployment/' },
    ],
    socialLinks: [
      { icon: 'discord', link: 'https://discord.gg/8D6TMdzZYJ', ariaLabel: 'Discord Server' },
      { icon: 'github', link: 'https://github.com/qelos-io/qelos', ariaLabel: 'GitHub Repository' }, 
    ],
    search: {
      provider: 'local'
    },
    footer: {
      message: 'Build SaaS Products Without Limits.',
      copyright: 'Copyright © 2025-present Qelos'
    },
    sidebar: [
      {
        text: 'TUTORIALS',
        items: [
          { text: 'Overview', link: '/tutorials/' },
          { text: 'Create an App & Add OpenAI Token', link: '/tutorials/create-app-openai-token' },
          { text: 'Configure Your First AI Agent', link: '/tutorials/configure-first-ai-agent' },
          { text: 'Build an Agentic Todo Machine', link: '/tutorials/agentic-todo-machine' },
        ]
      },
      {
        text: 'GETTING STARTED',
        items: [
          { text: 'Intro to Qelos', link: '/getting-started/intro' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Design Products Faster', link: '/getting-started/design-products-faster' },
          { text: 'Quick Reference', link: '/getting-started/quick-reference' },
          { text: 'Create your first plugin', link: '/getting-started/create-your-first-plugin' },
          { text: 'Create Blueprints', link: '/getting-started/create-blueprints' },
          { text: 'Admin Architecture', link: '/getting-started/admin-architecture' },
          { text: 'Design Settings', link: '/getting-started/design-settings' },
          {
            text: 'Deployment',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/deployment/' },
              { text: 'Quick Start', link: '/deployment/quick-start' },
              { text: 'GitHub Fork Setup', link: '/deployment/github-fork-setup' },
              { text: 'Kubernetes Cluster Management', link: '/deployment/kubernetes-cluster-management' },
              { text: 'Chart Structure', link: '/deployment/chart-structure' },
              { text: 'Configuration', link: '/deployment/configuration' },
              { text: 'Deployment Process', link: '/deployment/deployment-process' },
              { text: 'Production Guide', link: '/deployment/production-guide' },
              { text: 'Troubleshooting', link: '/deployment/troubleshooting' }
            ]
          },
        ]
      },
      {
        text: 'DESIGN',
        collapsed: true,
        items: [
          { text: 'Design System Overview', link: '/getting-started/design-system' },
          { text: 'Header & Navigation', link: '/getting-started/header-navigation-customization' },
          { text: 'Component Guide', link: '/getting-started/component-guide' },
          {
            text: 'Components',
            collapsed: true,
            items: [
              { text: 'AI Components', link: '/getting-started/components/ai-components' },
              { text: 'Data Components', link: '/getting-started/components/data-components' },
              { text: 'Form Components', link: '/getting-started/components/form-components' },
              { text: 'Display Components', link: '/getting-started/components/display-components' },
              { text: 'Layout Components', link: '/getting-started/components/layout-components' },
              { text: 'Navigation Components', link: '/getting-started/components/navigation-components' },
              { text: 'Feedback Components', link: '/getting-started/components/feedback-components' }
            ]
          }
        ]
      },
      {
        text: 'PAYMENTS',
        collapsed: true,
        items: [
          { text: 'Introduction', link: '/payments/' },
          { text: 'Sumit', link: '/payments/sumit' },
        ]
      },
      {
        text: 'SDK',
        collapsed: true,
        items: [
          { text: 'Introduction to the SDK', link: '/sdk/sdk' },
          { text: 'Installation', link: '/sdk/installation' },
          { text: 'Authentication', link: '/sdk/authentication' },
          { text: 'Token Refresh Functionality', link: '/sdk/token_refresh' },
          { text: 'Error Handling Guide', link: '/sdk/error_handling' },
          { text: 'TypeScript Types Reference', link: '/sdk/typescript_types' },
          { text: 'Troubleshooting', link: '/sdk/troubleshooting' },
          { text: 'Basic Usage', link: '/sdk/basic_usage' },
          { text: 'Blueprints Operations', link: '/sdk/blueprints_operations' },
          { text: 'Lambda/Serverless Operations', link: '/sdk/lambdas' },
          { text: 'Managing Configurations', link: '/sdk/managing_configurations' },
          { text: 'Managing Layouts', link: '/sdk/managing_layouts' },
          { text: 'Managing Plugins', link: '/sdk/managing_plugins' },
          { text: 'Managing Users', link: '/sdk/managing_users' },
          { text: 'Managing Workspaces', link: '/sdk/managing_workspaces' },
          { text: 'AI SDK Structure', link: '/sdk/ai_sdk_structure' },
          { text: 'AI Operations', link: '/sdk/ai_operations' },
          {
            text: 'Tutorials',
            collapsed: true,
            items: [
              { text: 'Authentication Flow', link: '/sdk/tutorials/authentication_flow' }
            ]
          }
        ]
      },
      {
        text: 'CLI',
        collapsed: true,
        items: [
          { text: 'Introduction', link: '/cli/' },
          { text: 'Create Command', link: '/cli/create' },
          { text: 'Pull Command', link: '/cli/pull' },
          { text: 'Push Command', link: '/cli/push' },
          { text: 'Generate Rules Command', link: '/cli/generate' },
          { text: 'Generate Blueprints', link: '/cli/blueprints' },
          { text: 'Dump Command', link: '/cli/dump' },
          { text: 'Restore Command', link: '/cli/restore' },
          { text: 'Agent Command', link: '/cli/agent' },
          { text: 'Global Environments', link: '/cli/global' }
        ]
      },
      {
        text: 'PLUGIN-PLAY',
        collapsed: true,
        items: [
          { text: 'Create a Plugin Page', link: '/plugins/create-page' },
          { text: 'Create a Plugin', link: '/plugins/create' },
          { text: 'Quick Plugin Page Creator', link: '/plugins/quick-create-page' },
          { text: 'Edit Mode - Plugin Page Editor', link: '/plugins/plugin-page-editor' },
          { text: 'Plugin Lifecycle', link: '/plugins/lifecycle' },
          { text: 'Deploy your Plugin', link: '/plugins/deploy' },
          { text: 'Hooks and Events', link: '/plugins/hooks' },
          { text: 'API Proxy', link: '/plugins/api-proxy' },
          { text: 'Micro-Frontend', link: '/plugins/micro-frontend' },
          { text: 'Pre-Designed Frontends', link: '/plugins/pre-designed-frontends' },
        ]
      },
      {
        text: 'WEB-SDK',
        collapsed: true,
        items: [
          { text: 'Cross-Domain Authorization', link: '/mfe/cross-domain-authorization' },
        ]
      },
      {
        text: 'PRE-DESIGNED FRONTENDS',
        collapsed: false,
        items: [
          { text: 'Blocks List', link: '/pre-designed-frontends/blocks-list' },
          { text: 'Rows List', link: '/pre-designed-frontends/rows-list' },
          { text: 'Plain', link: '/pre-designed-frontends/plain' },
          {
            text: '🌟 Template Ecosystem',
            collapsed: false,
            items: [
              { text: '📡 PubSub Events', link: '/pre-designed-frontends/pubsub-events' },
              { text: '🧩 Components', link: '/pre-designed-frontends/components/' }
            ]
          }
        ]
      }
    ]
  }
})




