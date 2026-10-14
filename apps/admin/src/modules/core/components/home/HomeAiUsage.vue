<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { formatRelative } from '@/modules/admins/services/event-presentation';

defineProps<{
  tokensDay: number;
  tokensWeek: number;
  threads: { _id?: string; title?: string; updated?: string | Date; integration?: string }[];
  loading: boolean;
}>();

const { locale, t } = useI18n();
const now = new Date();
const title = (value?: string) => (!value || /^\*?no title$/i.test(value.trim()) ? t('Untitled conversation') : value);
const num = (n: number) => (Number.isFinite(n) ? new Intl.NumberFormat().format(n) : '—');
</script>

<template>
  <section class="card" :aria-label="$t('AI usage')">
    <header class="head">
      <h2>{{ $t('AI usage') }}</h2>
    </header>

    <dl class="tokens">
      <div>
        <dt>{{ $t('Tokens (24 hours)') }}</dt>
        <dd>{{ num(tokensDay) }}</dd>
      </div>
      <div>
        <dt>{{ $t('Tokens (7 days)') }}</dt>
        <dd>{{ num(tokensWeek) }}</dd>
      </div>
    </dl>

    <h3 class="sub-head">{{ $t('Recent conversations') }}</h3>
    <el-skeleton v-if="loading && !threads.length" :rows="3" animated class="pad" />
    <ul v-else-if="threads.length" class="threads">
      <li v-for="(thread, index) in threads.slice(0, 5)" :key="thread._id || index">
        <span class="thread-title" dir="auto">{{ title(thread.title) }}</span>
        <time v-if="thread.updated" class="thread-when">{{ formatRelative(thread.updated, now, locale || undefined) }}</time>
      </li>
    </ul>
    <p v-else class="empty">{{ $t('No conversations yet.') }}</p>
  </section>
</template>

<style scoped lang="scss">
.card {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.head {
  padding: 14px 16px 4px;

  h2 {
    margin: 0;
    font-size: 1rem;
  }
}

.tokens {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
  padding: 8px 16px 14px;

  dt {
    color: var(--el-text-color-secondary);
    font-size: 0.82rem;
  }

  dd {
    margin: 4px 0 0;
    font-size: 1.6rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
}

.sub-head {
  margin: 0;
  padding: 10px 16px 4px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  font-weight: 600;
}

.pad {
  padding: 8px 16px 16px;
}

.threads {
  margin: 0;
  padding: 0 8px 8px;
  list-style: none;

  li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 8px;
  }
}

.thread-title {
  min-inline-size: 0;
  overflow: hidden;
  font-size: 0.92rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thread-when {
  flex: none;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}

.empty {
  margin: 0;
  padding: 12px 16px 18px;
  color: var(--el-text-color-secondary);
}
</style>
