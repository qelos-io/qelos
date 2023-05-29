<template>
  <div class="gp-item">
    <h4 v-if="$slots.title">
      <slot name="title"/>
    </h4>
    <slot/>
    <div class="actions small">
      <slot name="actions"/>
    </div>
  </div>
</template>

<style scoped lang="scss">
.gp-item {
  background-color: var(--negative-color);
  color: var(--main-color);
  border-radius: 10px;
  box-shadow: 1px 1px var(--border-color);
  margin: 20px;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s linear;

  &:hover {
    opacity: 0.9;
    box-shadow: 1px 2px var(--border-color);
  }

  ::v-deep(*) {
  }

  ::v-slotted(.metadata) {
    margin: 10px;
  }

  h4 {
    padding: 10px 10px;
    font-size: 18px;
  }
}

.metadata {
  margin: 10px;
}

.actions {
  margin: auto 10px 10px 10px;
  > ::v-deep(*) {
    padding-inline-end: 10px;
  }
}
</style>
