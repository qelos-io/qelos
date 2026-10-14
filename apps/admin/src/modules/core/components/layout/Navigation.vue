<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { isActivePath, pickTabs, type NavItem } from '../../services/navigation-model';
import { useNavSections } from '../../compositions/navigation';
import { useViewport } from '../../compositions/viewport';
import { openCreatePage, openPalette } from '../../store/shell';
import NavIcon from './NavIcon.vue';

defineOptions({ inheritAttrs: false });
const props = defineProps({ opened: Boolean });
const emit = defineEmits(['close', 'open']);

const route = useRoute();
const { appConfig } = useAppConfiguration();
const { isCompact, isTablet } = useViewport();

const isStackedHeader = computed(() => appConfig.value.layoutStyle === 'stacked-header');
const layout = computed(() => appConfig.value.navigationLayout || 'icon-text');

const sections = useNavSections();

const TAB_COUNT = 4;
const tabs = computed(() => pickTabs(sections.value, TAB_COUNT, route.path));
const moreIsActive = computed(() => !tabs.value.some((item) => isActivePath(item.to, route.path)));

// ---- collapse (desktop) ----
const COLLAPSE_KEY = 'qelos-nav-collapsed';
const isCollapsedPref = ref(false);
onMounted(() => {
  try {
    isCollapsedPref.value = localStorage.getItem(COLLAPSE_KEY) === 'true';
  } catch {
    // the preference is a convenience only
  }
});
function toggleCollapse() {
  isCollapsedPref.value = !isCollapsedPref.value;
  try {
    localStorage.setItem(COLLAPSE_KEY, String(isCollapsedPref.value));
  } catch {
    // ignore
  }
  setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
}

// the tablet rail is always collapsed; the drawer (opened) shows the full menu
const collapsed = computed(() => !isCompact.value && (isTablet.value || isCollapsedPref.value));
const drawer = computed(() => isTablet.value && props.opened);
// labels are hidden only while the rail is showing, not while its drawer is open
const rail = computed(() => collapsed.value && !drawer.value);
const sheet = computed(() => isCompact.value);

function activate(item: NavItem) {
  if (item.action === 'create-page') openCreatePage();
  emit('close');
}

// keep keyboard focus inside the sheet / drawer while it is open, and let Escape close it
const panel = ref<HTMLElement>();
watch(
  () => props.opened,
  (open) => {
    if (open) setTimeout(() => panel.value?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 50);
  },
);
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.opened) emit('close');
}
</script>

<template>
  <nav
    v-bind="$attrs"
    class="sidebar"
    :class="[
      `nav-layout-${layout}`,
      { show: opened, collapsed, drawer, sheet, 'stacked-header': isStackedHeader },
    ]"
    :aria-label="$t('Main navigation')"
    @keydown="onKeydown"
  >
    <div v-if="drawer || sheet" class="mask" @click="emit('close')" />

    <div ref="panel" class="panel" :role="sheet || drawer ? 'dialog' : undefined" :aria-modal="sheet || drawer ? 'true' : undefined" :aria-label="sheet || drawer ? $t('Menu') : undefined">
      <div v-if="sheet" class="sheet-head">
        <span class="grabber" aria-hidden="true" />
        <p class="sheet-title">{{ $t('Menu') }}</p>
        <el-button class="sheet-close" circle text size="large" data-autofocus :aria-label="$t('Close menu')" @click="emit('close')">
          <el-icon><font-awesome-icon :icon="['fas', 'xmark']" /></el-icon>
        </el-button>
      </div>

      <div v-else-if="!isStackedHeader || drawer" class="brand">
        <router-link to="/" class="home-logo" :class="{ 'has-small': !!appConfig.smallLogoUrl }" :aria-label="appConfig.name">
          <img v-if="appConfig.logoUrl" :alt="appConfig.name" :src="appConfig.logoUrl" class="logo-image" />
          <img v-if="appConfig.smallLogoUrl" :alt="appConfig.name" :src="appConfig.smallLogoUrl" class="small-logo-image" />
          <span v-if="!appConfig.logoUrl && !appConfig.smallLogoUrl" class="logo-text">{{ appConfig.name }}</span>
        </router-link>
        <button v-if="!isTablet" type="button" class="collapse-toggle" :aria-label="collapsed ? $t('Expand menu') : $t('Collapse menu')" :title="collapsed ? $t('Expand menu') : $t('Collapse menu')" @click="toggleCollapse">
          <el-icon><font-awesome-icon :icon="['fas', collapsed ? 'angle-right' : 'angle-left']" /></el-icon>
        </button>
        <button v-else-if="drawer" type="button" class="collapse-toggle" data-autofocus :aria-label="$t('Close menu')" @click="emit('close')">
          <el-icon><font-awesome-icon :icon="['fas', 'xmark']" /></el-icon>
        </button>
      </div>

      <button v-if="!sheet" type="button" class="jump" :title="rail ? $t('Go to…') : undefined" @click="openPalette(), emit('close')">
        <el-icon><font-awesome-icon :icon="['fas', 'magnifying-glass']" /></el-icon>
        <span class="jump-label">{{ $t('Go to…') }}</span>
        <kbd class="jump-key">⌘K</kbd>
      </button>

      <div class="scroll">
        <section v-for="section in sections" :key="section.key" class="group">
          <h2 v-if="section.label" class="group-label">{{ section.label }}</h2>
          <ul>
            <li v-for="item in section.items" :key="item.key">
              <component
                :is="item.to ? 'router-link' : 'button'"
                v-bind="item.to ? { to: item.to } : { type: 'button' }"
                class="item"
                :class="{ active: isActivePath(item.to, route.path) }"
                :aria-current="isActivePath(item.to, route.path) ? 'page' : undefined"
                :title="rail || layout === 'icons-only' ? item.label : undefined"
                @click="activate(item)"
              >
                <NavIcon :icon="item.icon" class="item-icon" />
                <span class="item-label">{{ item.label }}</span>
              </component>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </nav>

  <Teleport to="body">
    <nav v-if="isCompact" class="tabbar" :aria-label="$t('Quick navigation')">
      <router-link
        v-for="item in tabs"
        :key="item.key"
        :to="item.to!"
        class="tab"
        :class="{ active: isActivePath(item.to, route.path) }"
        :aria-current="isActivePath(item.to, route.path) ? 'page' : undefined"
      >
        <NavIcon :icon="item.icon" class="tab-icon" />
        <span class="tab-label">{{ item.label }}</span>
      </router-link>
      <button type="button" class="tab" :class="{ active: opened || moreIsActive }" :aria-expanded="opened" aria-haspopup="dialog" @click="emit('open')">
        <el-icon class="tab-icon"><font-awesome-icon :icon="['fas', 'bars']" /></el-icon>
        <span class="tab-label">{{ $t('More') }}</span>
      </button>
    </nav>
  </Teleport>
</template>

<style scoped lang="scss">
// Navigation tokens derive from the theme (Appearance), so custom and dark palettes stay consistent.
.sidebar,
.tabbar {
  --nav-text: var(--secondary-color);
  --nav-muted: var(--nav-muted-color, color-mix(in srgb, var(--secondary-color) 62%, var(--nav-bg-color)));
  --nav-hover: color-mix(in srgb, var(--secondary-color) 9%, var(--nav-bg-color));
  --nav-active-bg: color-mix(in srgb, var(--secondary-color) 18%, var(--nav-bg-color));
  --nav-active-text: var(--secondary-color);
  --nav-focus: var(--third-color, var(--secondary-color));
}

.sidebar {
  flex: none;
  inline-size: var(--nav-width);
  min-inline-size: var(--nav-width);
  transition: inline-size 0.2s ease, min-inline-size 0.2s ease;
  z-index: 100;
}

.panel {
  display: flex;
  flex-direction: column;
  block-size: 100%;
  min-block-size: 0;
  overflow: hidden;
  background: var(--nav-bg-color);
  color: var(--nav-text);
  box-shadow: var(--layout-nav-shadow, none);
  border-inline-end: var(--layout-nav-border, 0);
}

.mask {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: rgb(0 0 0 / 0.45);
  animation: fade 0.2s ease;
}

.brand {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  block-size: var(--header-height, 60px);
  padding-inline: 12px;
}

.home-logo {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-inline-size: 0;
  block-size: 100%;
  overflow: hidden;
  color: var(--nav-text);
  text-decoration: none;

  .logo-image {
    max-inline-size: 80%;
    max-block-size: 70%;
  }

  .small-logo-image {
    display: none;
    max-inline-size: 36px;
    max-block-size: 36px;
  }

  .logo-text {
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.collapse-toggle {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 32px;
  block-size: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--nav-muted);
  cursor: pointer;

  &:hover {
    background: var(--nav-hover);
    color: var(--nav-text);
  }
}

.jump {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  margin: 4px 12px 8px;
  padding: 0 10px;
  block-size: 38px;
  border: 1px solid color-mix(in srgb, var(--nav-text) 16%, transparent);
  border-radius: calc(var(--border-radius, 6px) + 2px);
  background: transparent;
  color: var(--nav-muted);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;

  &:hover {
    background: var(--nav-hover);
    color: var(--nav-text);
  }

  .jump-label {
    flex: 1;
    text-align: start;
  }

  .jump-key {
    padding: 1px 6px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--nav-text) 12%, transparent);
    font: inherit;
    font-size: 0.72rem;
  }
}

.scroll {
  flex: 1;
  min-block-size: 0;
  padding: 4px 8px 16px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--nav-text) 25%, transparent) transparent;
}

.group + .group {
  margin-block-start: 14px;
}

.group ul {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.group-label {
  margin: 0 0 4px;
  padding-inline: 12px;
  color: var(--nav-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  inline-size: 100%;
  min-block-size: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: calc(var(--border-radius, 6px) + 1px);
  background: transparent;
  color: var(--nav-text);
  font: inherit;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--nav-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--nav-focus);
    outline-offset: -2px;
  }

  &.active {
    background: var(--nav-active-bg);
    color: var(--nav-active-text);
    font-weight: 600;
  }
}

.item-icon {
  flex: none;
  inline-size: 22px;
  font-size: 18px;
}

.item-label {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ---- user-chosen navigation layouts (Appearance) ----
.nav-layout-text-only:not(.collapsed):not(.sheet):not(.drawer) .item-icon {
  display: none;
}

.nav-layout-compact:not(.sheet):not(.drawer) {
  .item {
    min-block-size: 32px;
    font-size: 0.88rem;
  }

  .item-icon {
    inline-size: 18px;
    font-size: 15px;
  }

  .group-label {
    font-size: 0.7rem;
  }
}

.nav-layout-icon-above:not(.collapsed):not(.sheet):not(.drawer) {
  .item {
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    min-block-size: 64px;
    padding-block: 8px;
    text-align: center;
  }

  .item-label {
    flex: none;
    font-size: 0.75rem;
  }

  .item-icon {
    font-size: 22px;
  }
}

.nav-layout-icons-only:not(.sheet):not(.drawer),
.collapsed:not(.sheet):not(.drawer) {
  .item {
    justify-content: center;
    padding: 0;
  }

  .item-label,
  .group-label,
  .jump-label,
  .jump-key {
    display: none;
  }

  .jump {
    justify-content: center;
    padding: 0;
  }

  .group + .group {
    margin-block-start: 8px;
    padding-block-start: 8px;
    border-block-start: 1px solid color-mix(in srgb, var(--nav-text) 12%, transparent);
  }

  .has-small .logo-image {
    display: none;
  }

  .has-small .small-logo-image {
    display: block;
  }

  .logo-image {
    max-inline-size: 40px;
  }

  .logo-text {
    display: none;
  }

  // the rail keeps a visible expand button under the logo
  .brand {
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    block-size: auto;
    padding: 12px 4px 6px;
  }

  .home-logo {
    flex: none;
    inline-size: 40px;
    block-size: 36px;
  }

  .collapse-toggle {
    inline-size: 36px;
    block-size: 28px;
    border-radius: calc(var(--border-radius, 6px) + 1px);
    background: var(--nav-hover);
    color: var(--nav-text);
  }
}

// ---- desktop: the sidebar floats as a card, like the header ----
@media (min-width: 1024px) {
  .sidebar {
    box-sizing: border-box;
    padding: var(--spacing);
    padding-inline-end: 0;
  }

  .panel {
    border-radius: var(--border-radius);
  }
}

// ---- tablet drawer: the rail keeps its width, the panel floats over the content ----
.drawer {
  .panel {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: min(300px, 86vw);
    z-index: 1;
    animation: slide-in 0.22s ease;
  }
}

// ---- phone: the menu is a bottom sheet, opened from the tab bar ----
.sidebar.sheet {
  position: fixed;
  inset: 0;
  inline-size: auto;
  min-inline-size: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 1100;

  &.show {
    visibility: visible;
    pointer-events: auto;
  }

  .panel {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: auto;
    max-block-size: 88dvh;
    border-radius: 20px 20px 0 0;
    border-inline-end: 0;
    padding-block-end: env(safe-area-inset-bottom, 0);
    transform: translateY(100%);
    transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &.show .panel {
    transform: translateY(0);
  }

  .sheet-head {
    position: relative;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    padding: 18px 8px 4px 20px;
  }

  .grabber {
    position: absolute;
    inset-block-start: 8px;
    inset-inline: 0;
    margin-inline: auto;
    inline-size: 36px;
    block-size: 4px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--nav-text) 28%, transparent);
  }

  .sheet-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .sheet-close {
    --el-button-text-color: var(--nav-text);
    --el-button-hover-bg-color: var(--nav-hover);
    inline-size: 44px;
    block-size: 44px;
  }

  .item {
    min-block-size: 48px;
    font-size: 1rem;
  }

  .item-icon {
    font-size: 20px;
  }

  .group-label {
    margin-block-start: 6px;
    font-size: 0.8rem;
  }
}

.sidebar.sheet {
  .scroll {
    padding-block-end: 12px;
  }
}

// ---- bottom tab bar (phones) ----
.tabbar {
  position: fixed;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: 1000;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0));
  background: var(--nav-bg-color);
  box-shadow: 0 -1px 0 color-mix(in srgb, var(--nav-text) 14%, transparent), 0 -6px 18px rgb(0 0 0 / 0.08);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-inline-size: 0;
  min-block-size: 52px;
  padding: 4px 2px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--nav-muted);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: 2px solid var(--nav-focus);
    outline-offset: -2px;
  }

  &.active {
    color: var(--nav-active-text);

    .tab-icon {
      background: var(--nav-active-bg);
    }

    .tab-label {
      font-weight: 700;
    }
  }
}

.tab-icon {
  display: grid;
  place-items: center;
  inline-size: 52px;
  block-size: 28px;
  border-radius: 14px;
  font-size: 18px;
  transition: background 0.15s ease;
}

.tab-label {
  max-inline-size: 100%;
  overflow: hidden;
  font-size: 0.7rem;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

@keyframes slide-in {
  from {
    transform: translateX(-24px);
    opacity: 0;
  }
}

[dir='rtl'] .drawer .panel,
:root[dir='rtl'] .drawer .panel {
  animation-name: slide-in-rtl;
}

@keyframes slide-in-rtl {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .panel,
  .item,
  .tab-icon,
  .mask {
    animation: none !important;
    transition: none !important;
  }
}
</style>
