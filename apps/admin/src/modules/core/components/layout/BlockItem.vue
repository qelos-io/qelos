<template>
  <el-card class="container">
    <template v-if="$slots.title" #header>
      <h3><slot name="title"/></h3>
    </template>
    <template v-else-if="$slots.header" #header>
      <slot name="header"/>
    </template>
    <slot/>
    <template #footer v-if="$slots.actions">
      <slot name="actions"/>
    </template>
  </el-card>
</template>