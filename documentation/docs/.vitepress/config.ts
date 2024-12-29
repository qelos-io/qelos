import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'QELOS',
  description: '',
  outDir: '../dist',
  themeConfig: {
    sidebar: [
      {
        text: 'GETTING STARTED',
        items: [
          { text: 'Intro to QELOS', link: '/getting-started/intro' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Create your first plugin', link: '/getting-started/create-your-first-plugin' },
          { text: 'Create Blueprints', link: '/getting-started/create-blueprints' },
          { text: 'Design Settings', link: '/getting-started/design-settings' },
          { text: 'Deployment', link: '/getting-started/deployment' },
        ]
      },
      {
        text: 'SDK',
        items: [
          { text: 'Introduction to the SDK', link: '/sdk/sdk' },
          { text: 'Installation', link: '/sdk/installation' },
          { text: 'Authentication', link: '/sdk/authentication' },
          { text: 'Basic Usage', link: '/sdk/basic_usage' },
          { text: 'Blueprints Operations', link: '/sdk/blueprints_operations' },
          { text: 'Managing Configurations', link: '/sdk/managing_configurations' },
          { text: 'Managing Layouts', link: '/sdk/managing_layouts' },
          { text: 'Managing Plugins', link: '/sdk/managing_plugins' },
          { text: 'Managing Users', link: '/sdk/managing_users' },
          { text: 'Managing Workspaces', link: '/sdk/managing_workspaces' }
        ]
      },
      {
        text: 'PLUGINS',
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
        text: 'MICRO-FRONTENDS',
        items: [
          { text: 'Cross-Domain Authorization', link: '/mfe/cross-domain-authorization' },
        ]
      },
      {
        text: 'PRE-DESIGNED FRONTENDS',
        items: [
          { text: 'Blocks List', link: '/pre-designed-frontends/blocks-list' },
          { text: 'Rows List', link: '/pre-designed-frontends/rows-list' },
          { text: 'Free HTML', link: '/pre-designed-frontends/free-html' },
        ]
      }
    ]
  }
})




