<script setup lang="ts">
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
</script>

<template>
  <h1>{{$t('Integrations')}}</h1>
  <p>{{$t('Choose any provider to manage connections and operations.')}}</p>

  <div class="blocks-list">
    <BlockItem class="source">
      <div centered>
        <img src="/logos/qelos_small.jpg">
      </div>
      <template #actions>
        <div class="actions">
          <el-button text>Connections</el-button>
          <el-button text>Integrations</el-button>
        </div>
      </template>
    </BlockItem>
    <BlockItem class="source">
      <div centered>
        <img src="/logos/openai.svg">
      </div>
      <template #actions>
        <div class="actions">
          <el-button text>Connections</el-button>
          <el-button text>Integrations</el-button>
        </div>
      </template>
    </BlockItem>
    <BlockItem class="source">
      <div centered>
        <img src="/logos/supabase.png">
      </div>
      <template #actions>
        <div class="actions">
          <el-button text>Connections</el-button>
          <el-button text>Integrations</el-button>
        </div>
      </template>
    </BlockItem>
    <BlockItem class="source">
      <div centered>
        <img src="/logos/n8n.png">
      </div>
      <template #actions>
        <div class="actions">
          <el-button text>Connections</el-button>
          <el-button text>Integrations</el-button>
        </div>
      </template>
    </BlockItem>
    <BlockItem class="source">
      <div centered>
        <p class="large">SMTP</p>
      </div>
      <template #actions>
        <div class="actions">
          <el-button text>Connections</el-button>
          <el-button text>Integrations</el-button>
        </div>
      </template>
    </BlockItem>
  </div>
</template>

<style scoped>
.blocks-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
}

.source img {
  max-width: 100%;
  max-height: 150px;
  margin: 10px;
  border-radius: 10px;
}

.blocks-list > * {
  width: 28%;
  margin: 2%;
}

[centered] {
  height: 100%;
  align-items: center;
}

.source :deep(.el-card__body) {
  height: calc(100% - 69px);
}

@media screen and (max-width: 1200px) {
  .blocks-list {
    flex-direction: column;

    > * {
      width: 96%;
    }
  }
}

.large {
  font-size: 64px;
}

.desktop .source .actions {
  visibility: hidden;
}

.source:hover .actions {
  visibility: visible;
}
</style>