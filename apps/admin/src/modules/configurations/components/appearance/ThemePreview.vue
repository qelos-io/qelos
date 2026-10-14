<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ThemeDraft } from '../../services/appearance';

const props = defineProps<{
  variables: Record<string, string>;
  draft: ThemeDraft;
  device: 'desktop' | 'phone';
}>();

// the mini app is laid out at a real device width and scaled to the panel, so spacing and type are true to size
const WIDTHS = { desktop: 960, phone: 390 } as const;
const HEIGHTS = { desktop: 560, phone: 700 } as const;

const outer = ref<HTMLElement>();
const available = ref(0);
let observer: ResizeObserver | undefined;
onMounted(() => {
  if (!outer.value) return;
  available.value = outer.value.clientWidth;
  observer = new ResizeObserver(([entry]) => (available.value = entry.contentRect.width));
  observer.observe(outer.value);
});
onBeforeUnmount(() => observer?.disconnect());

const width = computed(() => WIDTHS[props.device]);
const height = computed(() => HEIGHTS[props.device]);
const scale = computed(() => (available.value ? Math.min(1, available.value / width.value) : 1));

const navItems = ['Dashboard', 'Users', 'Content', 'Settings'];
const isPhone = computed(() => props.device === 'phone');
</script>

<template>
  <div ref="outer" class="outer">
    <div class="frame" :style="{ inlineSize: `${width * scale}px`, blockSize: `${height * scale}px` }">
      <div
        class="app"
        :class="[`layout-${draft.layoutStyle}`, `nav-${draft.navigationLayout}`, { phone: isPhone }]"
        :style="[{ inlineSize: `${width}px`, blockSize: `${height}px`, transform: `scale(${scale})` }, variables]"
        aria-hidden="true"
      >
        <header class="top">
          <img v-if="draft.logoUrl" class="logo" :src="draft.logoUrl" alt="" />
          <strong v-else class="logo-text">Acme</strong>
          <span class="search">Search…</span>
          <span class="avatar">A</span>
        </header>

        <div class="body">
          <nav v-if="!isPhone" class="nav">
            <img v-if="draft.smallLogoUrl && draft.navigationLayout === 'icons-only'" class="nav-logo" :src="draft.smallLogoUrl" alt="" />
            <span v-for="(item, index) in navItems" :key="item" class="nav-item" :class="{ active: index === 0 }">
              <i class="nav-icon" />
              <span class="nav-label">{{ item }}</span>
            </span>
          </nav>

          <main class="main">
            <h2>Dashboard</h2>
            <p class="lead">A short sample of body text, with a <a href="#" tabindex="-1">link</a> inside it.</p>

            <div class="tiles">
              <div class="tile"><span>Users</span><strong>1,284</strong></div>
              <div class="tile"><span>Revenue</span><strong>$9,420</strong></div>
              <div v-if="!isPhone" class="tile"><span>Plugins</span><strong>12</strong></div>
            </div>

            <div class="card">
              <div class="card-head"><strong>Team</strong><span class="btn primary">Invite</span></div>
              <div class="row"><span>Dana Levi</span><span class="tag">Admin</span></div>
              <div class="row"><span>Omar Haddad</span><span class="tag">Editor</span></div>
              <div class="field"><span class="input">Search people…</span><span class="btn">Filter</span></div>
              <div class="focus-sample"><span class="btn focused">Focused</span><span class="muted">Keyboard focus</span></div>
            </div>
          </main>
        </div>

        <footer v-if="isPhone" class="tabbar">
          <span v-for="(item, index) in navItems" :key="item" class="tab" :class="{ active: index === 0 }"><i class="nav-icon" />{{ item }}</span>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.outer {
  display: flex;
  justify-content: center;
  inline-size: 100%;
}

.frame {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
}

.app {
  --pad: var(--spacing, 8px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--body-bg, #f5f5f9);
  color: var(--text-color, #111);
  font-family: var(--font-family, sans-serif);
  font-size: var(--base-font-size, 16px);
  transform-origin: top left;

  h2 {
    margin: 0 0 4px;
    font-family: var(--headings-font-family, inherit);
    font-size: 1.5em;
    line-height: 1.2;
    color: var(--text-color);
  }

  a {
    color: var(--link, var(--main-color));
  }
}

[dir='rtl'] .app {
  transform-origin: top right;
}

.top {
  display: flex;
  flex: none;
  align-items: center;
  gap: 12px;
  block-size: 52px;
  margin: var(--pad) var(--pad) 0;
  padding-inline: 16px;
  border-radius: var(--border-radius, 6px);
  background: var(--surface, #fff);
  box-shadow: var(--box-shadow, none);
}

.logo {
  max-block-size: 28px;
}

.logo-text {
  font-family: var(--headings-font-family, inherit);
}

.search {
  margin-inline-start: auto;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius, 6px);
  background: var(--inputs-bg-color, #fff);
  color: var(--inputs-text-color, #333);
  font-size: 0.85em;
  opacity: 0.8;
}

.avatar {
  display: grid;
  place-items: center;
  inline-size: 30px;
  block-size: 30px;
  border-radius: 50%;
  background: var(--main-color);
  color: var(--button-text-color, #fff);
  font-size: 0.8em;
}

.body {
  display: flex;
  flex: 1;
  min-block-size: 0;
  gap: var(--pad);
  padding: var(--pad);
}

.nav {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 4px;
  inline-size: 180px;
  padding: 12px 8px;
  border-radius: var(--border-radius, 6px);
  background: var(--nav-bg-color, #1c4252);
  color: var(--secondary-color, #ccc);
}

.nav-logo {
  align-self: center;
  max-inline-size: 36px;
  margin-block-end: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: calc(var(--border-radius, 6px) - 1px);
  font-size: 0.9em;

  &.active {
    background: color-mix(in srgb, var(--secondary-color) 18%, var(--nav-bg-color));
    font-weight: 600;
  }
}

.nav-icon {
  display: inline-block;
  flex: none;
  inline-size: 16px;
  block-size: 16px;
  border-radius: 4px;
  background: currentcolor;
  opacity: 0.7;
}

.main {
  flex: 1;
  min-inline-size: 0;
  padding: 8px 12px;
  overflow: hidden;
}

.lead {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary, #666);
  font-size: 0.95em;
}

.tiles {
  display: flex;
  gap: var(--pad);
  margin-block-end: var(--pad);
}

.tile {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius, 6px);
  background: var(--surface, #fff);
  box-shadow: var(--box-shadow, none);

  span {
    color: var(--el-text-color-secondary, #666);
    font-size: 0.8em;
  }

  strong {
    font-family: var(--headings-font-family, inherit);
    font-size: 1.35em;
  }
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius, 6px);
  background: var(--surface, #fff);
  box-shadow: var(--box-shadow, none);
}

.card-head,
.row,
.field,
.focus-sample {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.row {
  padding-block: 4px;
  border-block-start: 1px solid var(--border-color);
  font-size: 0.9em;
}

.tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--main-color-light, #eef);
  color: var(--main-color);
  font-size: 0.75em;
}

.input {
  flex: 1;
  padding: 7px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius, 6px);
  background: var(--inputs-bg-color, #fff);
  color: var(--inputs-text-color, #333);
  font-size: 0.9em;
}

.btn {
  padding: 7px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--button-radius, var(--border-radius, 6px));
  background: var(--surface, #fff);
  color: var(--text-color);
  font-size: 0.85em;
  font-weight: 500;

  &.primary,
  &.focused {
    border-color: var(--button-bg-color, var(--main-color));
    background: var(--button-bg-color, var(--main-color));
    color: var(--button-text-color, #fff);
  }

  &.focused {
    outline: 2px solid var(--focus-color, var(--main-color));
    outline-offset: 2px;
  }
}

.muted {
  color: var(--el-text-color-secondary, #666);
  font-size: 0.8em;
}

// ---- layout styles ----
.layout-stacked-header .top {
  margin: 0;
  border-radius: 0;
}

.layout-main-bordered {
  .top {
    background: transparent;
    box-shadow: none;
  }

  .main {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius, 6px);
    background: var(--surface, #fff);
    box-shadow: var(--box-shadow, none);
  }
}

// ---- navigation layouts ----
.nav-icons-only .nav {
  align-items: center;
  inline-size: 64px;

  .nav-label {
    display: none;
  }
}

.nav-text-only .nav-icon {
  display: none;
}

.nav-compact .nav {
  inline-size: 150px;

  .nav-item {
    padding-block: 5px;
    font-size: 0.8em;
  }
}

.nav-icon-above .nav {
  inline-size: 120px;

  .nav-item {
    flex-direction: column;
    gap: 4px;
    font-size: 0.75em;
    text-align: center;
  }
}

// ---- phone ----
.phone {
  .main {
    padding: 8px 4px;
  }

  .tiles {
    flex-wrap: wrap;

    .tile {
      flex-basis: 40%;
    }
  }
}

.tabbar {
  display: flex;
  flex: none;
  justify-content: space-around;
  padding: 8px 4px 12px;
  background: var(--nav-bg-color, #1c4252);
  color: var(--secondary-color, #ccc);
  font-size: 0.7em;

  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;

    &.active {
      font-weight: 700;
    }
  }
}
</style>
