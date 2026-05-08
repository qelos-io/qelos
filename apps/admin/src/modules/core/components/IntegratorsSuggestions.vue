<template>
  <section class="integrators-suggestions">
    <div class="suggestions-head">
      <h2 class="section-title">{{ $t('Connect your app to Qelos') }}</h2>
      <p class="section-sub">
        {{ $t('Drop one of the official integrator libraries into your existing app to identify Qelos users and workspaces inside your own routes — same contract, every framework.') }}
      </p>
    </div>

    <div class="integrators-grid">
      <div v-for="integrator in visibleIntegrators" :key="integrator.id" class="unified-card integrator-card">
        <div class="integrator-head">
          <div class="integrator-icon" :style="{ background: integrator.gradient }">
            <font-awesome-icon :icon="integrator.icon" size="lg" />
          </div>
          <div class="integrator-headings">
            <h3>{{ integrator.name }}</h3>
            <code class="integrator-package" dir="ltr">{{ integrator.pkg }}</code>
          </div>
        </div>

        <p class="integrator-description">{{ $t(integrator.description) }}</p>

        <div class="integrator-install" dir="ltr">
          <code>{{ integrator.install }}</code>
          <CopyToClipboard
            tag="button"
            class="install-copy"
            :icon="['fas', 'copy']"
            :value="integrator.install"
            text=""
          />
        </div>

        <div class="integrator-actions">
          <a :href="integrator.docsUrl" target="_blank" rel="noopener" class="docs-link">
            <font-awesome-icon :icon="['fas', 'book']" />
            {{ $t('Read the docs') }}
          </a>
        </div>
      </div>
    </div>

    <div class="integrators-footer" v-if="integrators.length > initialCount">
      <el-button text type="primary" @click="showAll = !showAll">
        <font-awesome-icon :icon="['fas', showAll ? 'chevron-up' : 'chevron-down']" />
        {{ showAll
          ? $t('Show fewer integrators')
          : $t('Show all {count} integrators', { count: integrators.length }) }}
      </el-button>
      <a href="https://docs.qelos.io/integrators/" target="_blank" rel="noopener" class="overview-link">
        {{ $t('Integrators overview') }}
        <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" />
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import CopyToClipboard from '@/modules/pre-designed/components/CopyToClipboard.vue';

interface Integrator {
  id: string;
  name: string;
  pkg: string;
  description: string;
  install: string;
  docsUrl: string;
  icon: string[];
  gradient: string;
}

const integrators: Integrator[] = [
  {
    id: 'express',
    name: 'Express',
    pkg: '@qelos/integrator-express',
    description: 'Express middleware that resolves the Qelos user and active workspace before your handlers run.',
    install: 'npm install @qelos/integrator-express @qelos/sdk',
    docsUrl: 'https://docs.qelos.io/integrators/express',
    icon: ['fas', 'server'],
    gradient: 'linear-gradient(135deg, #4b5563, #1f2937)',
  },
  {
    id: 'next',
    name: 'Next.js',
    pkg: '@qelos/integrator-next',
    description: 'App Router and Pages Router integration — request-scoped SDK, server actions, and route handlers.',
    install: 'npm install @qelos/integrator-next @qelos/sdk',
    docsUrl: 'https://docs.qelos.io/integrators/next',
    icon: ['fab', 'react'],
    gradient: 'linear-gradient(135deg, #111827, #374151)',
  },
  {
    id: 'fastapi',
    name: 'FastAPI',
    pkg: 'qelos-integrator-fastapi',
    description: 'Python ASGI middleware for FastAPI and Starlette — same contract, snake_case configuration.',
    install: 'pip install qelos-integrator-fastapi qelos-sdk',
    docsUrl: 'https://docs.qelos.io/integrators/fastapi',
    icon: ['fab', 'python'],
    gradient: 'linear-gradient(135deg, #0ea5e9, #facc15)',
  },
  {
    id: 'nuxt',
    name: 'Nuxt 3',
    pkg: '@qelos/integrator-nuxt',
    description: 'Nuxt server module that attaches the Qelos context to event.context.qelos for every request.',
    install: 'npm install @qelos/integrator-nuxt @qelos/sdk',
    docsUrl: 'https://docs.qelos.io/integrators/nuxt',
    icon: ['fab', 'vuejs'],
    gradient: 'linear-gradient(135deg, #00dc82, #0a7a4a)',
  },
  {
    id: 'fastify',
    name: 'Fastify',
    pkg: '@qelos/integrator-fastify',
    description: 'Fastify plugin that decorates the request with the resolved Qelos user, workspace, and SDK.',
    install: 'npm install @qelos/integrator-fastify @qelos/sdk',
    docsUrl: 'https://docs.qelos.io/integrators/fastify',
    icon: ['fas', 'bolt'],
    gradient: 'linear-gradient(135deg, #facc15, #f97316)',
  },
  {
    id: 'nest',
    name: 'NestJS',
    pkg: '@qelos/integrator-nest',
    description: 'NestJS module exposing a QelosGuard, decorators, and a per-request Qelos SDK provider.',
    install: 'npm install @qelos/integrator-nest @qelos/sdk',
    docsUrl: 'https://docs.qelos.io/integrators/nest',
    icon: ['fas', 'cubes'],
    gradient: 'linear-gradient(135deg, #e0234e, #b51d3f)',
  },
];

const initialCount = 3;
const showAll = ref(false);

const visibleIntegrators = computed(() =>
  showAll.value ? integrators : integrators.slice(0, initialCount),
);
</script>

<style scoped lang="scss">
.integrators-suggestions {
  padding: 0 20px 30px;
}

.suggestions-head {
  margin-bottom: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.section-sub {
  margin: 8px 0 0;
  max-width: 760px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

.integrators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1200px;
}

@media (min-width: 1200px) {
  .integrators-grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: 1100px;
  }
}

.unified-card {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.unified-card::before {
  content: '';
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: 4px;
  background: linear-gradient(90deg, var(--main-color), #667eea);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.unified-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  border-color: rgba(var(--main-color-rgb), 0.2);
}

.unified-card:hover::before {
  opacity: 1;
}

.integrator-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
}

.integrator-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.integrator-icon {
  inline-size: 48px;
  block-size: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.integrator-headings {
  flex: 1;
  min-width: 0;
}

.integrator-headings h3 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  padding: 0;
}

.integrator-package {
  display: inline-block;
  font-size: 12px;
  color: #64748b;
  background: rgba(100, 116, 139, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
  word-break: break-all;
}

.integrator-description {
  margin: 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.55;
}

.integrator-install {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  font-family: 'Fira Code', 'JetBrains Mono', Consolas, monospace;
  font-size: 12.5px;
  overflow: hidden;

  code {
    flex: 1;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: thin;
  }
}

.install-copy {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
  }
}

.integrator-actions {
  margin-block-start: auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.docs-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--main-color);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(var(--main-color-rgb), 0.08);
  }
}

.integrators-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-block-start: 24px;
  max-width: 1200px;
}

.overview-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--main-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

@media (max-width: 768px) {
  .integrators-suggestions {
    padding: 0 12px 20px;
  }

  .integrators-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .integrators-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
